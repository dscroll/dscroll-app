"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  useColorModeValue,
  Input,
  InputGroup,
  InputRightElement,
  Icon,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Spinner,
  SimpleGrid,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  useToast,
  Flex,
} from "@chakra-ui/react";
import { useAccount, useChainId, useConnectorClient } from "wagmi";
import {
  FiSearch,
  FiExternalLink,
  FiSettings,
  FiPlusCircle,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiShield,
  FiZap,
} from "react-icons/fi";
import { sdk, utils, initializeSDK, handleSDKError, getODudeNetworkFromChainId } from "@/lib/odude";
import { isSubNameSupported, getAllowedTlds } from "@/utils/domain";
import config from "@/config/config.json";
import { formatEther, formatUnits, BrowserProvider, Contract } from "ethers";

import Web3PageContainer from "@/components/Web3PageContainer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shortenAddress } from "@/utils/web3";

interface TldResult {
  name: string;
  tokenId?: string;
  owner?: string;
  price?: string;
  commission?: string;
  isActive?: boolean;
  isMinted: boolean;
  isLocked?: boolean;
  tldOwner?: string;
  tldNotFound?: boolean;
}

interface Eligibility {
  eligible: boolean;
  available: boolean;
  cost: bigint;
  reason: string;
}

type MintStep = "idle" | "checking" | "signing" | "pending" | "success" | "error";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: connectorClient } = useConnectorClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const router = useRouter();
  const searchCancelledRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TldResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Eligibility state
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [isErc20, setIsErc20] = useState(false);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [spenderAddress, setSpenderAddress] = useState<string>("");
  
  // Validation state
  const [mintStep, setMintStep] = useState<MintStep>("idle");
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Bulk search state
  const [isBulkSearch, setIsBulkSearch] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Theme colors
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const searchBg = useColorModeValue("white", "rgba(255,255,255,0.03)");
  const searchBorder = useColorModeValue("gray.200", "rgba(255,255,255,0.1)");
  const searchHoverBorder = useColorModeValue("gray.300", "rgba(255,255,255,0.2)");
  const modalBg = useColorModeValue("white", "gray.900");
  const cardBg = useColorModeValue("gray.50", "rgba(255,255,255,0.04)");
  const successBg = useColorModeValue("green.50", "rgba(72,187,120,0.1)");
  const errorBg = useColorModeValue("red.50", "rgba(245,101,101,0.1)");

  useEffect(() => {
    initializeSDK();
  }, []);

  // Real-time validation
  useEffect(() => {
    if (!searchQuery.trim()) {
      setValidationError(null);
      return;
    }

    const domainName = searchQuery.toLowerCase().trim();
    
    // Check for invalid characters (alphanumeric, @ and - only)
    const isValidChars = /^[a-z0-9@-]+$/.test(domainName);
    
    if (!isValidChars) {
      setValidationError("Invalid characters. Use only letters, numbers, and @.");


    } else if (domainName.includes('@')) {
      // If it has @, check if it's a valid subname and supported TLD
      if (!utils.isValidSubName(domainName)) {
        setValidationError("Invalid sub-name format. Use exactly one @ symbol.");


      } else if (!isSubNameSupported(domainName)) {
        setValidationError("Unsupported TLD. Only " + getAllowedTlds().join(", ") + " are supported.");


      } else {
        setValidationError(null);
      }
    } else {
      // It's a simple name, which is now allowed for bulk search
      if (domainName.length < 1) {
        setValidationError("Please enter at least one character.");


      } else {
        setValidationError(null);
      }
    }

  }, [searchQuery]);

  // Fetch eligibility whenever modal opens for an un-minted TLD
  useEffect(() => {
    if (isOpen && result && !result.isMinted) {
      fetchEligibility(result.name);
    }
  }, [isOpen, result?.name, result?.isMinted]);

  const fetchEligibility = async (tldName: string) => {
    setEligibilityLoading(true);
    setEligibilityError(null);
    setEligibility(null);
    setTokenBalance(null);
    setAllowance(null);
    setIsErc20(false);
    setSpenderAddress("");
    
    try {
      const el = await sdk.checkMintEligibility(tldName);
      
      // Check if it's an ERC20 payment
      const tld = tldName.split("@").pop();
      if (!tld) throw new Error("Invalid domain format");


      const tldConfig = config.domains.find(d => d.tld.toLowerCase() === tld.toLowerCase());

      // Check TLD lock status
      const tldData = await sdk.getTldInfo(tld);
      const isLocked = (tldData?.getTLDPrice || BigInt(0)) === BigInt(1982);
      const tldOwner = tldData?.getTLDOwner || "";

      if (isLocked) {
        // Sync result if not already set (fallback)
        if (!result?.isLocked || result?.tldOwner !== tldOwner) {
          setResult(prev => prev ? { ...prev, isLocked, tldOwner } : null);
        }
        
        const isTldOwner = address && tldOwner && address.toLowerCase() === tldOwner.toLowerCase();
        if (!isTldOwner) {
          el.eligible = false;
          el.reason = "Minting is locked by the TLD owner. Only the owner can mint sub-names.";


        }
      }
      
      if (tldConfig && tldConfig.erc20_addr) {
        setIsErc20(true);
        setTokenSymbol(tldConfig.erc20_name || "Tokens");


        
        if (address && connectorClient) {
          try {
            const provider = new BrowserProvider(connectorClient.transport as any, chainId);
            const ERC20_ABI = [
              "function balanceOf(address owner) view returns (uint256)",
              "function decimals() view returns (uint8)"
            ];
            const contract = new Contract(tldConfig.erc20_addr, ERC20_ABI, provider);
            const balance = await contract.balanceOf(address);
            setTokenBalance(balance);
            
            // Get spender address via SDK NetworkList() — same approach as the SDK's network-info example
            let spender = "";
            try {
              const network = getODudeNetworkFromChainId(chainId);
              if (network) {
                const networkInfo = sdk.NetworkList();
                spender = networkInfo?.supportedNetworks?.[network]?.contracts?.Registry || "";
              }
            } catch (e) {
              console.error("Error resolving spender via NetworkList:", e);
            }
            setSpenderAddress(spender);

            // If balance is less than cost, mark ineligible
            if (balance < el.cost) {
              el.eligible = false;
              const decimals = tldConfig.decimals || 18;
              el.reason = `Insufficient ${tldConfig.erc20_name} balance. You have ${formatUnits(balance, decimals)} but need ${formatUnits(el.cost, decimals)}.`;


            } else if (spender) {
              // Balance is sufficient — now check allowance
              const ERC20_ALLOWANCE_ABI = ["function allowance(address owner, address spender) view returns (uint256)"];
              const allowanceContract = new Contract(tldConfig.erc20_addr, ERC20_ALLOWANCE_ABI, provider);
              const currentAllowance = await allowanceContract.allowance(address, spender);
              setAllowance(currentAllowance);

              if (currentAllowance < el.cost) {
                el.eligible = false;
                el.reason = `Insufficient allowance. Please approve ${tldConfig.erc20_name} to continue.`;


              }
            } else {
              // Spender could not be resolved — cannot safely verify allowance
              el.eligible = false;
              el.reason = `Unable to verify ${tldConfig.erc20_name} allowance. Add 'registrar_addr' to config or contact support.`;


            }
          } catch (balanceErr) {
            console.error("Error fetching token balance:", balanceErr);
          }
        }
      }
      
      setEligibility(el);
    } catch (err) {
      const e = handleSDKError(err, "checking eligibility");


      setEligibilityError(e.message);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || validationError || loading) return;

    const query = searchQuery.toLowerCase().trim();
    
    setLoading(true);
    setError(null);
    setResult(null);
    setBulkResults([]);
    setIsBulkSearch(false);
    setEligibility(null);
    setMintStep("idle");
    setMintError(null);
    setMintTxHash(null);
    searchCancelledRef.current = false;

    try {
      if (query.includes('@')) {
        // Single search logic
        setIsBulkSearch(false);
        try {
          const tld = query.split("@").pop();
          if (!tld) throw new Error("Invalid domain format");

          const network = sdk.getNetworkForTLD(tld);
          const exists = await sdk.resolver(network).nameExists(query);
          
          let nameData = null;
          if (exists) {
            const registry = sdk.registry(network);
            const tokenId = await registry.getTokenId(query);
            const owner = await registry.ownerOf(tokenId);
            nameData = {
              name: query,
              tokenId: tokenId.toString(),
              owner: owner,
              exists: true
            };
          }

          const tldData = await sdk.getTldInfo(tld);
          const tldPrice = tldData?.getTLDPrice || BigInt(0);
          const isLocked = tldPrice === BigInt(1982);
          const tldOwner = tldData?.getTLDOwner || "N/A";

          if (nameData && nameData.exists) {
            setResult({
              name: query,
              tokenId: nameData.tokenId?.toString(),
              owner: nameData.owner || "N/A",
              price: "N/A",
              commission: "N/A",
              isActive: true,
              isMinted: true,
              isLocked,
              tldOwner,
            });
          } else {
            setResult({ 
              name: query, 
              isMinted: false,
              isLocked,
              tldOwner,
            });
          }
        } catch (err: any) {
          console.error("Error in single search details:", err);
          const isTldNotFound = err?.message?.includes("TLD: Not found");
          setResult({ name: query, isMinted: false, tldNotFound: isTldNotFound });
        }
        if (!searchCancelledRef.current) {
          onOpen();
        }
      } else {
        // Bulk search logic
        setIsBulkSearch(true);
        setBulkLoading(true);
        onOpen();
        
        const results = [];
        for (const tldInfo of config.domains) {
          if (searchCancelledRef.current) break;

          const subname = `${query}@${tldInfo.tld}`;
          let isMinted = false;
          let details = null;
          
          try {
            // First check if it exists using resolver.nameExists to avoid rate-limiting reverts!
            const network = sdk.getNetworkForTLD(tldInfo.tld);
            const exists = await sdk.resolver(network).nameExists(subname);
            
            if (exists && !searchCancelledRef.current) {
              const registry = sdk.registry(network);
              const tokenId = await registry.getTokenId(subname);
              const owner = await registry.ownerOf(tokenId);
              
              details = {
                name: subname,
                tokenId: tokenId.toString(),
                owner: owner,
                exists: true
              };
              isMinted = true;
            } else {
              isMinted = false;
            }
          } catch (e) {
            console.error("Error checking name details in bulk search:", e);
            isMinted = false;
          }

          let isLocked = false;
          let tldOwner = "N/A";
          let tldNotFound = false;
          
          if (!searchCancelledRef.current) {
            try {
              const tldData = await sdk.getTldInfo(tldInfo.tld);
              isLocked = (tldData?.getTLDPrice || BigInt(0)) === BigInt(1982);
              tldOwner = tldData?.getTLDOwner || "N/A";
            } catch (e: any) {
              console.error("Error fetching TLD info for", tldInfo.tld, e);
              tldNotFound = e?.message?.includes("TLD: Not found");
            }
          }

          if (searchCancelledRef.current) break;

          results.push({
            tld: tldInfo.tld,
            title: tldInfo.title,
            subname,
            isMinted,
            cost: tldInfo.cost,
            currency: tldInfo.erc20_name ? `$${tldInfo.erc20_name}` : "ETH",
            details,
            isLocked,
            tldOwner,
            tldNotFound
          });
        }
        
        if (!searchCancelledRef.current) {
          setBulkResults(results);
          setBulkLoading(false);
        }
      }
    } catch (err) {
      if (!searchCancelledRef.current) {
        const handledError = handleSDKError(err, "searching");
        setError(handledError.message);
      }
    } finally {
      if (!searchCancelledRef.current) {
        setLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleModalClose = () => {
    if (mintStep === "pending" || mintStep === "signing" || isApproving) return; // block close during tx
    
    searchCancelledRef.current = true;
    setLoading(false);
    setBulkLoading(false);

    setMintStep("idle");
    setMintError(null);
    setMintTxHash(null);
    setIsBulkSearch(false);
    onClose();
  };

  // ─── Approve Handler ──────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!eligibility || !address || !connectorClient || !spenderAddress) return;
    
    const tld = result!.name.split("@").pop();
    const tldConfig = config.domains.find(d => d.tld.toLowerCase() === tld?.toLowerCase());
    if (!tldConfig?.erc20_addr) return;

    setIsApproving(true);
    try {
      const provider = new BrowserProvider(connectorClient.transport as any, chainId);
      const signer = await provider.getSigner();
      const ERC20_ABI = ["function approve(address spender, uint256 amount) returns (bool)"];
      const tokenContract = new Contract(tldConfig.erc20_addr, ERC20_ABI, signer);
      
      const tx = await tokenContract.approve(spenderAddress, eligibility.cost);
      await tx.wait();
      
      // Update allowance locally
      setAllowance(eligibility.cost);
      
      // Refresh eligibility to update the "Eligible to mint" status and show Mint button
      await fetchEligibility(result!.name);
      
      toast({
        title: "Approval Successful",
        description: `You can now mint ${result!.name}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      console.error("Approval failed:", err);
      toast({
        title: "Approval Failed",
        description: err?.message || "Unknown error during approval",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsApproving(false);
    }
  };

  // ─── Mint Handler ─────────────────────────────────────────────────────────
  const handleMint = useCallback(async () => {
    if (!eligibility?.eligible || !address || !connectorClient) return;

    setMintStep("signing");
    setMintError(null);

    try {
      // Build ethers signer from wagmi connector
      const network = getODudeNetworkFromChainId(chainId);
      if (!network) throw new Error("Unsupported network. Please switch to a supported chain.");

      // Connect ethers BrowserProvider via wagmi connector transport
      const provider = new BrowserProvider(connectorClient.transport as any, chainId);
      const signer = await provider.getSigner();

      // Inject signer into SDK
      const sdkAny = sdk as any;
      sdkAny.signer = signer;
      if (typeof sdkAny.setSigner === "function") sdkAny.setSigner(signer);
      if (sdkAny.signers) sdkAny.signers[network] = signer;

      // Also ensure sdk is connected to the right network
      if (typeof sdkAny.connectNetwork === "function") {
        try { sdkAny.connectNetwork(network); } catch { /* ok */ }
      }

      setMintStep("pending");

      const mintTx = await sdk.mintDomain(result!.name, address, {
        value: isErc20 ? BigInt(0) : eligibility.cost,
      });

      setMintTxHash(mintTx.hash);
      setMintStep("success");

      toast({
        title: "🎉 TLD Minted Successfully!",
        description: `${result!.name} is now yours. Redirecting to manage page...`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });

      // Navigate to manage page after short delay
      setTimeout(() => {
        router.push(`/manage/subname/${result!.name}`);
      }, 2500);

    } catch (err: any) {
      setMintStep("error");
      let msg = err?.message || "Unknown error during minting.";
      if (msg.includes("insufficient funds")) msg = "Insufficient ETH balance to cover minting cost + gas.";
      else if (msg.includes("user rejected") || msg.includes("User rejected")) msg = "Transaction rejected by user.";
      else if (msg.includes("already exists")) msg = "This TLD was already minted. Please search again.";
      setMintError(msg);

      toast({
        title: "Minting Failed",
        description: msg,
        status: "error",
        duration: 6000,
        isClosable: true,
        position: "top",
      });
    }
  }, [eligibility, address, connectorClient, chainId, result, router, toast]);

  const isOwner =
    isConnected &&
    address &&
    result?.owner &&
    address.toLowerCase() === result.owner.toLowerCase();

  const mintInProgress = mintStep === "signing" || mintStep === "pending";

  // ─── Mint step label ──────────────────────────────────────────────────────
  const mintStepLabel: Record<MintStep, string> = {
    idle: "Mint Now",
    checking: "Checking...",
    signing: "Waiting for Signature...",
    pending: "Minting on Chain...",
    success: "Minted! Redirecting...",
    error: "Retry Mint",
  };



  return (
    <Web3PageContainer>
      <VStack spacing={8} py={{ base: 10, md: 16 }} textAlign="center">
        <VStack spacing={3}>
          <Heading size="2xl" fontWeight="900" letterSpacing="-0.03em">
            {config.ui_labels.hero_headline.split(' ')[0]}{" "}
            <Text as="span" bgGradient="linear(to-r, brand.400, accent.400)" bgClip="text">
              {config.ui_labels.hero_headline.split(' ').slice(1).join(' ')}
            </Text>
          </Heading>
          <Text color={mutedText} fontSize="lg" maxW="600px">
            {config.ui_labels.hero_description}
          </Text>
        </VStack>

        <Box w="full" maxW="700px" px={4}>
          <InputGroup size="lg">
            <Input
              placeholder={config.ui_labels.search_placeholder}
              bg={searchBg}
              border="1px solid"
              borderColor={searchBorder}
              borderRadius="2xl"
              height="66px"
              fontSize="lg"
              pl={6}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              _focus={{ borderColor: "brand.400", boxShadow: "0 0 25px rgba(26, 128, 255, 0.2)" }}
              _hover={{ borderColor: searchHoverBorder }}
            />
            <InputRightElement h="66px" pr={2} w="auto">
              <Button
                h="50px"
                px={8}
                bgGradient={validationError ? "none" : "linear(to-r, brand.400, accent.400)"}
                color={validationError ? "gray.400" : "white"}
                borderRadius="xl"
                fontSize="md"
                fontWeight="700"
                leftIcon={loading ? <Spinner size="xs" /> : <FiSearch />}
                onClick={handleSearch}
                isLoading={loading}
                isDisabled={!!validationError || !searchQuery.trim() || loading}
                _hover={!validationError && searchQuery.trim() ? { opacity: 0.9, transform: "translateY(-1px)", boxShadow: "0 4px 20px rgba(26, 128, 255, 0.4)" } : {}}
                _active={!validationError && searchQuery.trim() ? { transform: "translateY(0)" } : {}}
                transition="all 0.2s ease"
              >
                {config.ui_labels.search_button}
              </Button>
            </InputRightElement>
          </InputGroup>
          {validationError ? (
            <Alert status="error" variant="subtle" mt={3} borderRadius="xl" py={2}>
              <AlertIcon />
              <AlertDescription fontSize="sm" fontWeight="500">
                {validationError}
              </AlertDescription>
            </Alert>
          ) : error ? (
            <Text color="red.400" mt={2} fontSize="sm">{error}</Text>
          ) : null}
        </Box>

        <Flex
          gap={2}
          align="center"
          justify="center"
          wrap="wrap"
          opacity={0.8}
          maxW="full"
          px={4}
        >
          <Text fontSize="xs" fontWeight="600" color={mutedText}>{config.ui_labels.example_label}</Text>
          {config.ui_labels.search_examples.map((ext) => (
            <Badge
              key={ext}
              variant="subtle"
              colorScheme="blue"
              px={3} py={1}
              borderRadius="full"
              fontSize="xs"
              cursor="pointer"
              onClick={() => setSearchQuery(ext)}
              _hover={{ transform: "translateY(-1px)", bg: "brand.100", color: "brand.600" }}
            >
              {ext}
            </Badge>
          ))}

        </Flex>
      </VStack>

      {/* ─── Result Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isOpen} onClose={handleModalClose} size="4xl" isCentered closeOnOverlayClick={!mintInProgress}>
        <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.700" />
        <ModalContent
          borderRadius="3xl"
          overflow="hidden"
          bg={modalBg}
          border="1px solid"
          borderColor={searchBorder}
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        >
          <ModalHeader pt={6} pb={2} pr={12}>
            <HStack spacing={3}>
              <Heading size="md" fontWeight="800">
                {isBulkSearch ? config.ui_labels.discovery_results_label : config.ui_labels.lookup_result_label}
              </Heading>
              {!isBulkSearch && result && (
                <Badge
                  colorScheme={result.isMinted ? (result.isActive ? "green" : "orange") : (result.tldNotFound ? "gray" : (result.isLocked ? "red" : "brand"))}
                  borderRadius="lg" px={3} py={1}
                >
                  {result.isMinted ? (result.isActive ? "Registered" : "Inactive") : (result.tldNotFound ? "Not Supported" : (result.isLocked ? "Locked" : "Available"))}

                </Badge>

              )}
            </HStack>
          </ModalHeader>
          {!mintInProgress && <ModalCloseButton mt={4} mr={4} borderRadius="full" />}

          <ModalBody pb={6}>
            {isBulkSearch ? (
              <VStack align="stretch" spacing={4}>
                {bulkLoading ? (
                  <VStack py={10} spacing={4}>
                    <Spinner size="xl" thickness="4px" speed="0.65s" emptyColor="gray.200" color="brand.400" />
                    <Text fontWeight="600" color={mutedText}>Scanning all supported TLDs...</Text>


                  </VStack>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {bulkResults.map((res) => (
                      <Box 
                        key={res.subname} 
                        p={5} 
                        borderRadius="2xl" 
                        bg={cardBg} 
                        border="1px solid" 
                        borderColor={res.isMinted ? searchBorder : "green.300"}
                        transition="all 0.2s"
                        _hover={{ transform: "translateY(-2px)", boxShadow: "sm", borderColor: "brand.400" }}
                      >
                        <HStack justify="space-between" mb={3}>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="md" fontWeight="800" color="brand.500" mb={0}>{res.subname}</Text>
                            <Text fontSize="xs" fontWeight="600" color={mutedText} mt={-0.5} mb={2}>{res.title}</Text>
                            <HStack spacing={1}>
                              <Text fontSize="xs" fontWeight="700" color={res.isLocked ? "red.400" : mutedText}>
                                {res.isLocked ? "LOCKED" : `${res.cost} ${res.currency}`}
                              </Text>
                            </HStack>
                          </VStack>
                          <Badge 
                            variant="subtle" 
                            colorScheme={res.isMinted ? "orange" : (res.tldNotFound ? "gray" : (res.isLocked ? "red" : "green"))}
                            borderRadius="lg"
                            px={2}
                          >
                            {res.isMinted ? "Registered" : (res.tldNotFound ? "Not Supported" : (res.isLocked ? "Locked" : "Available"))}

                          </Badge>

                        </HStack>
                        
                        <Button
                          size="md"
                          w="full"
                          borderRadius="xl"
                          leftIcon={res.isMinted ? <FiSearch /> : <FiPlusCircle />}
                          variant={res.isMinted ? "outline" : "solid"}
                          bgGradient={res.isMinted ? "none" : (res.tldNotFound ? "none" : (res.isLocked ? "linear(to-r, gray.400, gray.500)" : "linear(to-r, green.400, teal.500)"))}
                          color={res.isMinted ? "inherit" : "white"}
                          _hover={res.isMinted ? { bg: "whiteAlpha.100" } : { opacity: 0.9 }}
                          isDisabled={(res.tldNotFound) || (!res.isMinted && res.isLocked && (!address || address.toLowerCase() !== res.tldOwner?.toLowerCase()))}
                          onClick={() => {
                            if (res.isMinted) {
                              setIsBulkSearch(false);
                              setResult({
                                name: res.subname,
                                tokenId: res.details?.tokenId?.toString(),
                                owner: res.details?.owner || "N/A",
                                price: "N/A",
                                commission: "N/A",
                                isActive: true,
                                isMinted: true,
                                isLocked: res.isLocked,
                                tldOwner: res.tldOwner,
                              });
                            } else {
                              setIsBulkSearch(false);
                              setResult({ 
                                name: res.subname, 
                                isMinted: false,
                                isLocked: res.isLocked,
                                tldOwner: res.tldOwner,
                                tldNotFound: res.tldNotFound
                              });
                            }
                          }}
                        >
                          {res.isMinted ? "Whois" : (res.tldNotFound ? "Unsupported" : "Mint")}

                        </Button>

                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </VStack>
            ) : result && (
              <Box mb={2}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} alignItems="start">
                  {/* Left Column: Sub-name Info & Banner */}
                  <VStack align="stretch" spacing={5}>
                    <Box>
                      <HStack justify="space-between" align="center">
                        <Box>
                          <Text fontSize="sm" color={mutedText} fontWeight="600" mb={1}>SUB-NAME</Text>


                          <Heading size="xl" color="brand.400">{result.name}</Heading>
                          <Text fontSize="xs" fontWeight="600" color={mutedText} mt={1}>
                            {config.domains.find(d => result.name.endsWith(`@${d.tld}`))?.title}
                          </Text>
                        </Box>
                        {bulkResults.length > 0 && (
                          <Button 
                            size="xs" 
                            variant="ghost" 
                            colorScheme="brand"
                            onClick={() => setIsBulkSearch(true)}
                            leftIcon={<FiSearch size={12} />}
                          >
                            Back to All

                          </Button>

                        )}
                      </HStack>
                    </Box>

                    {result.isMinted ? (
                      <Box>
                        <Text fontSize="xs" color={mutedText} fontWeight="700" textTransform="uppercase" mb={1}>
                          Owner Address

                        </Text>

                        <HStack>
                          <Text fontWeight="600" fontSize="sm" fontFamily="mono" noOfLines={1}>
                            {result.owner ? shortenAddress(result.owner) : "N/A"}
                          </Text>
                          <Button
                            size="xs" variant="ghost"
                            onClick={() => result.owner && navigator.clipboard.writeText(result.owner)}
                            leftIcon={<FiExternalLink size={12} />}
                          >
                            Copy

                          </Button>

                        </HStack>
                      </Box>
                    ) : (
                      <Box
                        p={6}
                        borderRadius="2xl"
                        bg={cardBg}
                        border="1px solid"
                        borderColor={result.tldNotFound ? "orange.300" : "green.300"}
                        textAlign="center"
                      >
                        <Icon as={result.tldNotFound ? FiXCircle : FiPlusCircle} boxSize={12} color={result.tldNotFound ? "orange.400" : "brand.400"} mb={3} />
                        <Heading size="md" mb={2}>{result.tldNotFound ? "TLD Not Supported" : "Sub-name is Available!"}</Heading>
                        <Text fontSize="sm" color={mutedText}>
                          {result.tldNotFound 
                            ? "This TLD is not registered on the current network. Please try a different network or TLD."
                            : "This sub-name has not been minted yet. Claim it now to secure your identity!"
                          }
                        </Text>


                      </Box>
                    )}

                    {/* Mint Progress / Errors */}
                    {(mintStep !== "idle" && mintStep !== "error") && (
                      <Box p={4} borderRadius="xl" bg={cardBg} border="1px solid" borderColor="brand.400">
                        <VStack spacing={3}>
                          <HStack spacing={3} w="full">
                            {mintStep === "success"
                              ? <Icon as={FiCheckCircle} color="green.400" boxSize={5} />
                              : <Spinner size="sm" color="brand.400" />}
                            <Text fontSize="sm" fontWeight="700">
                              {mintStep === "signing" && "Waiting for signature..."}
                              {mintStep === "pending" && "Minting on-chain..."}
                              {mintStep === "success" && "🎉 Minted!"}


                            </Text>
                          </HStack>
                          {mintStep !== "success" && (
                            <Progress
                              size="xs" w="full" borderRadius="full"
                              isIndeterminate
                              colorScheme="teal"
                            />
                          )}
                        </VStack>
                      </Box>
                    )}

                    {mintStep === "error" && mintError && (
                      <Alert status="error" borderRadius="xl" fontSize="sm">
                        <AlertIcon />
                        <VStack align="start" spacing={0}>
                          <AlertTitle fontSize="sm">Failed</AlertTitle>


                          <AlertDescription fontSize="xs">{mintError}</AlertDescription>
                        </VStack>
                      </Alert>
                    )}
                  </VStack>

                  {/* Right Column: Details & Eligibility */}
                  <VStack align="stretch" spacing={5}>
                    {result.isMinted ? (
                      <VStack align="stretch" spacing={4}>
                        <SimpleGrid columns={2} spacing={4}>
                          <Box p={3} bg={cardBg} borderRadius="xl">
                            <Text fontSize="xs" color={mutedText} fontWeight="700" textTransform="uppercase" mb={1}>Token ID</Text>


                            <Text fontWeight="600" noOfLines={1} title={result.tokenId}>{result.tokenId}</Text>
                          </Box>
                          <Box p={3} bg={cardBg} borderRadius="xl">
                            <Text fontSize="xs" color={mutedText} fontWeight="700" textTransform="uppercase" mb={1}>Price</Text>


                            <Text fontWeight="600">{result.price} ETH</Text>
                          </Box>
                          <Box p={3} bg={cardBg} borderRadius="xl">
                            <Text fontSize="xs" color={mutedText} fontWeight="700" textTransform="uppercase" mb={1}>Status</Text>


                            <Badge colorScheme={result.isActive ? "green" : "red"}>
                              {result.isActive ? "Active" : "Inactive"}


                            </Badge>
                          </Box>
                          {isOwner && (
                            <Box p={3} bg={cardBg} borderRadius="xl">
                              <Text fontSize="xs" color={mutedText} fontWeight="700" textTransform="uppercase" mb={1}>Commission</Text>


                              <Text fontWeight="600">{result.commission}%</Text>
                            </Box>
                          )}
                        </SimpleGrid>
                        
                        <Box p={4} borderRadius="xl" bg={cardBg} border="1px solid" borderColor={searchBorder}>
                          <Text fontSize="xs" fontWeight="700" color={mutedText} mb={2} textTransform="uppercase">Quick Actions</Text>
                          <Text fontSize="sm">Owner can manage sub-name settings and transfer ownership from the management dashboard.</Text>


                        </Box>
                      </VStack>
                    ) : (
                      /* ── Available Sub-name – Eligibility Section ── */
                      <VStack align="stretch" spacing={4}>
                        {eligibilityLoading && (
                          <VStack spacing={2} py={8} bg={cardBg} borderRadius="2xl">
                            <Spinner size="md" color="brand.400" />
                            <Text fontSize="sm" color={mutedText}>Checking requirements...</Text>


                          </VStack>
                        )}

                        {eligibilityError && !eligibilityLoading && (
                          <Alert status="warning" borderRadius="xl" fontSize="sm">
                            <AlertIcon />
                            <AlertDescription>{eligibilityError}</AlertDescription>
                          </Alert>
                        )}

                        {eligibility && !eligibilityLoading && (
                          <VStack align="stretch" spacing={4}>
                            {/* Mint Fee */}
                            {!result.isLocked && (
                              <Box
                                p={4} borderRadius="xl"
                                bg={cardBg}
                                border="1px solid"
                                borderColor={eligibility.eligible ? "green.400" : "orange.400"}
                              >
                                <HStack justify="space-between" mb={1}>
                                  <HStack spacing={2}>
                                    <Icon as={FiDollarSign} color={eligibility.eligible ? "green.400" : "orange.400"} />
                                    <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color={mutedText}>
                                      Minting Fee


                                    </Text>
                                  </HStack>
                                  <Badge
                                    colorScheme={eligibility.eligible ? "green" : "orange"}
                                    borderRadius="lg" px={2} py={0.5}
                                  >
                                    {eligibility.eligible ? "Ready" : "Ineligible"}


                                  </Badge>
                                </HStack>
                                <Text fontSize="2xl" fontWeight="900" color={eligibility.eligible ? "brand.400" : "orange.400"}>
                                  {formatEther(eligibility.cost)} {
                                    (() => {
                                      const tld = result.name.split("@").pop();
                                      const tldConfig = config.domains.find(d => d.tld.toLowerCase() === tld?.toLowerCase());
                                      return tldConfig?.erc20_name ? `$${tldConfig.erc20_name}` : "ETH";
                                    })()
                                  }
                                </Text>
                              </Box>
                            )}

                            {/* Token Balance Check */}
                            {isErc20 && (
                              <Box 
                                p={4} borderRadius="xl" 
                                bg={tokenBalance !== null && tokenBalance >= eligibility.cost ? "green.50" : "red.50"} 
                                border="1px dashed" 
                                borderColor={tokenBalance !== null && tokenBalance >= eligibility.cost ? "green.200" : "red.200"}
                              >
                                <HStack justify="space-between">
                                  <Text fontSize="xs" fontWeight="700" color={mutedText} textTransform="uppercase">
                                    Your {tokenSymbol} Balance


                                  </Text>
                                  {tokenBalance !== null ? (
                                    <Text fontSize="sm" fontWeight="800" color={tokenBalance >= eligibility.cost ? "green.600" : "red.600"}>
                                      {formatEther(tokenBalance)} {tokenSymbol}
                                    </Text>
                                  ) : (
                                    <Spinner size="xs" />
                                  )}
                                </HStack>
                              </Box>
                            )}

                            {/* Eligibility status */}
                            <Box p={4} borderRadius="xl" bg={eligibility.eligible ? successBg : errorBg}
                              border="1px solid"
                              borderColor={eligibility.eligible ? "green.300" : "red.300"}
                            >
                              <HStack spacing={3}>
                                <Icon
                                  as={eligibility.eligible ? FiCheckCircle : FiXCircle}
                                  color={eligibility.eligible ? "green.400" : "red.400"}
                                  boxSize={5} flexShrink={0}
                                />
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="700">
                                    {eligibility.eligible ? "Eligible to mint" : (result.isLocked ? "Minting Locked" : "Not eligible")}


                                  </Text>
                                  <Text fontSize="xs" color={mutedText}>{eligibility.reason}</Text>
                                </VStack>
                              </HStack>
                            </Box>

                            {/* Benefits */}
                            <Box p={4} borderRadius="xl" bg={cardBg} border="1px solid" borderColor={searchBorder}>
                              <HStack spacing={2} mb={3}>
                                <Icon as={FiShield} color="brand.400" boxSize={4} />
                                <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color={mutedText}>
                                  Sub-name Benefits


                                </Text>
                              </HStack>
                              <SimpleGrid columns={1} spacing={2}>
                                {[
                                  "Unique digital identity",
                                  "Global cross-chain resolution",
                                  "Full ownership & control",
                                ].map((b) => (

                                  <HStack key={b} spacing={2}>
                                    <Icon as={FiZap} color="green.400" boxSize={3} />
                                    <Text fontSize="xs">{b}</Text>
                                  </HStack>
                                ))}

                              </SimpleGrid>
                            </Box>
                          </VStack>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </SimpleGrid>
              </Box>
            )}
          </ModalBody>

          <ModalFooter
            bg={useColorModeValue("gray.50", "whiteAlpha.50")}
            borderTop="1px solid"
            borderColor={searchBorder}
          >
            {(result || isBulkSearch) && (
              <HStack w="full" justify="flex-end" spacing={4}>
                <Button
                  variant="ghost"
                  onClick={handleModalClose}
                  borderRadius="xl"
                  isDisabled={mintInProgress}
                >
                  {mintStep === "success" ? "Close" : "Cancel"}


                </Button>

                {!isBulkSearch && result && (
                  result.isMinted ? (
                    isOwner ? (
                      <Button
                        as={Link}
                        href={`/manage/subname/${result.name}`}
                        leftIcon={<FiSettings />}
                        bgGradient="linear(to-r, brand.400, accent.400)"
                        color="white"
                        borderRadius="xl"
                        _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                      >
                        Manage Sub-name


                      </Button>
                    ) : (
                      <Button isDisabled variant="outline" borderRadius="xl">
                        Already Minted


                      </Button>
                    )
                  ) : (
                    /* ── Approve / Mint Button ── */
                    isErc20 && (allowance === null || (eligibility !== null && allowance < eligibility.cost)) ? (
                      <Button
                        leftIcon={isApproving ? <Spinner size="xs" /> : <FiCheckCircle />}
                        onClick={handleApprove}
                        isLoading={isApproving}
                        isDisabled={
                          !isConnected ||
                          eligibilityLoading ||
                          mintInProgress ||
                          !spenderAddress ||
                          result.tldNotFound ||
                          (tokenBalance !== null && eligibility !== null && tokenBalance < eligibility.cost)
                        }
                        title={
                          !spenderAddress
                            ? "Registrar address not resolved — add 'registrar_addr' to config.json for this TLD"
                            : !isConnected
                            ? "Connect wallet to approve"
                            : (tokenBalance !== null && eligibility !== null && tokenBalance < eligibility.cost)
                            ? "Insufficient token balance to approve"
                            : `Approve ${tokenSymbol} spending`
                        }


                        bgGradient="linear(to-r, blue.400, brand.400)"
                        color="white"
                        borderRadius="xl"
                        px={7}
                        fontWeight="700"
                        boxShadow="0 4px 20px rgba(56, 178, 172, 0.35)"
                        _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
                      >
                        {isApproving ? "Approving..." : `Approve ${tokenSymbol}`}


                      </Button>
                    ) : (
                      <Button
                        leftIcon={
                          mintInProgress ? <Spinner size="xs" /> :
                          mintStep === "success" ? <FiCheckCircle /> :
                          <FiPlusCircle />
                        }
                        onClick={handleMint}
                        isLoading={false}
                        isDisabled={
                          !isConnected ||
                          !eligibility?.eligible ||
                          eligibilityLoading ||
                          mintInProgress ||
                          mintStep === "success" ||
                          result.tldNotFound ||
                          (result.isLocked && (!address || address.toLowerCase() !== result.tldOwner?.toLowerCase()))
                        }
                        bgGradient={
                          !eligibility?.eligible
                            ? undefined
                            : mintStep === "success"
                            ? "linear(to-r, green.400, teal.400)"
                            : "linear(to-r, green.400, teal.500)"
                        }
                        colorScheme={!eligibility?.eligible ? "gray" : undefined}
                        color="white"
                        borderRadius="xl"
                        px={7}
                        fontWeight="700"
                        boxShadow={eligibility?.eligible && mintStep === "idle" ? "0 4px 20px rgba(72,187,120,0.35)" : "none"}
                        _hover={
                          eligibility?.eligible && !mintInProgress
                            ? {
                                opacity: 0.92,
                                transform: "translateY(-2px)",
                                boxShadow: "0 8px 28px rgba(72,187,120,0.45)",
                              }
                            : {}
                        }
                        _active={{ transform: "translateY(0)" }}
                        transition="all 0.2s ease"
                        title={
                          !isConnected
                            ? "Connect wallet to mint"
                            : !eligibility
                            ? "Checking eligibility..."
                            : !eligibility.eligible
                            ? eligibility.reason
                            : "Click to mint this sub-name"
                        }

                      >
                        {mintStepLabel[mintStep]}
                      </Button>
                    )
                  )
                )}
              </HStack>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Web3PageContainer>
  );
}
