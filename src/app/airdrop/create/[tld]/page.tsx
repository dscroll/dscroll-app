"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Divider,
  SimpleGrid,
  Spinner,
  Badge,
  Select,
} from "@chakra-ui/react";
import { useAccount, useWalletClient } from "wagmi";
import {
  FiArrowLeft,
  FiGift,
  FiCheckCircle,
  FiInfo,
  FiLock,
  FiUnlock,
  FiSend
} from "react-icons/fi";
import { useParams, useRouter } from "next/navigation";
import { ethers } from "ethers";

import { sdk, initializeSDK, handleSDKError } from "@/lib/odude";
import { formatAddress, formatTokenAmount } from "@/utils/format";
import { executeTransaction } from "@/utils/transaction";
import Web3PageContainer from "@/components/Web3PageContainer";
import config from "@/config/config.json";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)"
];

export default function CreateAirdropPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const toast = useToast();

  const availableTlds = config.domains.map((d: any) => d.tld.toLowerCase());
  const initialTld = params.tld && availableTlds.includes((params.tld as string).toLowerCase())
    ? (params.tld as string).toLowerCase()
    : (availableTlds[0] || "eth");

  const [selectedTld, setSelectedTld] = useState<string>(initialTld);

  useEffect(() => {
    if (params?.tld) {
      const tldParam = (params.tld as string).toLowerCase();
      if (availableTlds.includes(tldParam)) {
        setSelectedTld(tldParam);
      }
    }
  }, [params?.tld]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [perUserShare, setPerUserShare] = useState("");

  const [tokenInfo, setTokenInfo] = useState<{ name: string, symbol: string, decimals: number, balance: bigint, allowance: bigint } | null>(null);
  const [fetchingToken, setFetchingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // 1. Fetch Token Info when address changes
  useEffect(() => {
    if (ethers.isAddress(tokenAddress) && isConnected && address) {
      fetchTokenDetails();
    } else {
      setTokenInfo(null);
    }
  }, [tokenAddress, isConnected, address]);

  const fetchTokenDetails = async () => {
    setFetchingToken(true);
    setTokenError(null);
    try {
      initializeSDK();
      const provider = sdk.getProvider('basesepolia');
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const rwAirdropAddress = (sdk.rwairdrop() as any).address;

      const [name, symbol, decimals, balance, allowance] = await Promise.all([
        contract.name().catch(() => { throw new Error("Not an ERC20") }),
        contract.symbol(),
        contract.decimals(),
        contract.balanceOf(address!),
        contract.allowance(address!, rwAirdropAddress)
      ]);

      setTokenInfo({ name, symbol, decimals, balance, allowance });
    } catch (e) {
      console.error("Token fetch failed", e);
      setTokenInfo(null);
      setTokenError("Invalid token address or network error");
    } finally {
      setFetchingToken(false);
    }
  };

  const handleApprove = async () => {
    if (!walletClient || !tokenInfo) return;
    setLoading(true);
    try {
      initializeSDK();
      const signer = await new ethers.BrowserProvider(walletClient as any).getSigner();
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const rwAirdropAddress = (sdk.rwairdrop() as any).address;
      const amountToApprove = ethers.parseUnits(totalAmount, tokenInfo.decimals);

      const txPromise = contract.approve(rwAirdropAddress, amountToApprove);

      await executeTransaction(
        txPromise,
        toast,
        {
          loadingTitle: "Approving Token",
          loadingMessage: `Allowing RWAirdrop to spend ${tokenInfo.symbol}...`,
          successTitle: "Approval Success",
          successMessage: `${tokenInfo.symbol} has been approved for the airdrop.`,
          onSuccess: () => fetchTokenDetails()
        }
      );
    } catch (error) {
      // Error handled by executeTransaction
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!walletClient || !tokenInfo) return;
    setLoading(true);
    try {
      initializeSDK();
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, 'basesepolia');

      const totalWei = ethers.parseUnits(totalAmount, tokenInfo.decimals);
      const shareWei = ethers.parseUnits(perUserShare, tokenInfo.decimals);

      if (totalWei > tokenInfo.balance) {
        throw new Error("Insufficient token balance");
      }

      if (totalWei > tokenInfo.allowance) {
        throw new Error("Insufficient allowance. Please approve tokens first.");
      }

      await executeTransaction(
        (sdk.rwairdrop('basesepolia') as any).createAirdrop(
          selectedTld,
          tokenAddress,
          totalWei,
          shareWei
        ),
        toast,
        {
          loadingTitle: "Launching Airdrop",
          loadingMessage: "Creating your reward campaign...",
          successTitle: "Airdrop Live!",
          successMessage: `Your ${tokenInfo.symbol} airdrop for @${selectedTld} has been created.`,
          onSuccess: () => router.push("/airdrop")
        }
      );
    } catch (error) {
      // Error handled by executeTransaction
    } finally {
      setLoading(false);
    }
  };

  const isApproved = tokenInfo && tokenInfo.allowance >= ethers.parseUnits(totalAmount || "0", tokenInfo.decimals);
  const canCreate = isApproved && totalAmount && perUserShare && tokenInfo && tokenInfo.balance >= ethers.parseUnits(totalAmount, tokenInfo.decimals);

  return (
    <Web3PageContainer maxW="800px">
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <Breadcrumb fontSize="sm" color="gray.500">
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => router.push("/airdrop")}>Airdrop Explorer</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Create Reward</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <Button leftIcon={<FiArrowLeft />} variant="ghost" size="sm" onClick={() => router.back()}>
            Back to Explorer
          </Button>
        </HStack>

        <Box bg="rgba(26, 32, 44, 0.4)" p={8} borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.100">
          <VStack align="stretch" spacing={8}>
            <Box>
              <Heading size="lg" mb={2}>Create Reward Campaign</Heading>
              <Text color="gray.400">Distribution tokens to holders of sub-names under <b>@{selectedTld}</b></Text>
            </Box>

            <Divider borderColor="whiteAlpha.100" />

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <FormControl isRequired gridColumn={{ base: "span 1", md: "span 2" }}>
                <FormLabel color="gray.500">Target TLD</FormLabel>
                <Select
                  value={selectedTld}
                  onChange={(e) => setSelectedTld(e.target.value)}
                  bg="blackAlpha.300"
                  borderColor="whiteAlpha.200"
                  color="white"
                  _hover={{ borderColor: "blue.400" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                >
                  {config.domains.map((d: any) => (
                    <option key={d.tld} value={d.tld.toLowerCase()} style={{ backgroundColor: "#1A202C", color: "white" }}>
                      @{d.tld.toLowerCase()} - {d.title}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.500">Token Address</FormLabel>
                <Input
                  placeholder="0x..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  bg="blackAlpha.300"
                  borderColor="whiteAlpha.200"
                  _hover={{ borderColor: "blue.400" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                />
              </FormControl>

              <Box pt={8}>
                {fetchingToken ? <Spinner size="sm" /> : tokenInfo ? (
                  <Badge colorScheme="blue" p={2} borderRadius="md" w="full" textAlign="center">
                    {tokenInfo.name} ({tokenInfo.symbol})
                  </Badge>
                ) : tokenError ? (
                  <Badge colorScheme="red" p={2} borderRadius="md" w="full" textAlign="center">
                    {tokenError}
                  </Badge>
                ) : tokenAddress && !ethers.isAddress(tokenAddress) ? (
                  <Badge colorScheme="red" p={2} borderRadius="md" w="full" textAlign="center">
                    Invalid Address Format
                  </Badge>
                ) : null}
              </Box>

              <FormControl isRequired>
                <FormLabel color="gray.500">Total Reward Amount</FormLabel>
                <Input
                  type="number"
                  placeholder="1000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  bg="blackAlpha.300"
                  borderColor="whiteAlpha.200"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.500">Share Per User</FormLabel>
                <Input
                  type="number"
                  placeholder="10"
                  value={perUserShare}
                  onChange={(e) => setPerUserShare(e.target.value)}
                  bg="blackAlpha.300"
                  borderColor="whiteAlpha.200"
                />
              </FormControl>
            </SimpleGrid>

            {tokenInfo && (
              <SimpleGrid columns={3} spacing={4} bg="blackAlpha.400" p={4} borderRadius="xl">
                <Box>
                  <Text fontSize="xs" color="gray.500">YOUR BALANCE</Text>
                  <Text fontWeight="bold">{formatTokenAmount(tokenInfo.balance, tokenInfo.decimals)} {tokenInfo.symbol}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">ALLOWANCE</Text>
                  <Text fontWeight="bold">{formatTokenAmount(tokenInfo.allowance, tokenInfo.decimals)} {tokenInfo.symbol}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">EST. RECIPIENTS</Text>
                  <Text fontWeight="bold">
                    {totalAmount && perUserShare && parseFloat(perUserShare) > 0 ? Math.floor(parseFloat(totalAmount) / parseFloat(perUserShare)) : 0}
                  </Text>
                </Box>
              </SimpleGrid>
            )}

            <VStack spacing={4}>
              {!isApproved && tokenInfo && (
                <Button
                  w="full"
                  size="lg"
                  colorScheme="purple"
                  leftIcon={<FiUnlock />}
                  onClick={handleApprove}
                  isLoading={loading}
                  isDisabled={!totalAmount || fetchingToken}
                >
                  Approve {tokenInfo.symbol}
                </Button>
              )}

              <Button
                w="full"
                size="lg"
                colorScheme="blue"
                leftIcon={isApproved ? <FiSend /> : <FiLock />}
                onClick={handleCreate}
                isLoading={loading}
                isDisabled={!canCreate || loading || fetchingToken}
              >
                {isApproved ? "Launch Airdrop" : "Approve Required"}
              </Button>
            </VStack>

            <HStack bg="rgba(43, 108, 176, 0.2)" p={4} borderRadius="xl" spacing={4}>
              <Icon as={FiInfo} color="blue.400" fontSize="20px" />
              <Text fontSize="xs" color="blue.200">
                The tokens will be locked in the RWAirdrop contract and distributed to anyone who owns a valid sub-name under <b>@{selectedTld}</b>. You cannot withdraw remaining tokens. Only TLD owner can claim remaining tokens.
              </Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Web3PageContainer>
  );
}
