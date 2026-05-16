"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Spinner,
  Badge,
  SimpleGrid,
  useToast,
  IconButton,
  Card,
  CardBody,
  Icon,
  Switch,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Progress,
  Link,
  Image,
} from "@chakra-ui/react";
import { ethers, formatEther, parseEther } from "ethers";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave, FiSend, FiInfo, FiDollarSign, FiLock, FiUnlock, FiCreditCard, FiUser, FiCheckCircle, FiZap, FiActivity, FiExternalLink } from "react-icons/fi";
import { useAccount, useWalletClient, usePublicClient, useChainId } from "wagmi";
import { motion } from "framer-motion";

import Web3PageContainer from "@/components/Web3PageContainer";
import { sdk, utils, initializeSDK, handleSDKError, reconnectRPC, getODudeNetworkFromChainId } from "@/lib/odude";
import { isSubNameSupported } from "@/utils/domain";
import { updateRecordSync, getRecord } from "@/app/actions/records";

const MotionBox = motion(Box);

const NFTPreview = ({ url }: { url: string }) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!url || !url.startsWith("http")) {
      setImage(null);
      return;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && data.image) {
          setImage(data.image);
        } else if (isMounted) {
          setImage(null);
        }
      })
      .catch(() => {
        if (isMounted) setImage(null);
      });

    return () => { isMounted = false; };
  }, [url]);

  if (!image) return null;

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      mt={3}
      borderRadius="xl"
      overflow="hidden"
      boxShadow="0 8px 24px rgba(0,0,0,0.12)"
      border="1px solid"
      borderColor="gray.200"
      _dark={{ borderColor: "whiteAlpha.200" }}
      maxW="260px"
    >
      <Image
        src={image}
        alt="NFT Preview"
        w="full"
        h="auto"
        objectFit="cover"
        transition="transform 0.5s ease"
        _hover={{ transform: "scale(1.1)" }}
        fallback={<Box p={10}><Spinner size="sm" /></Box>}
      />
    </MotionBox>
  );
};


interface SubNameData {
  name: string;
  tokenId: bigint;
  owner: string;
  price: bigint;
  commission: bigint;
  erc20Token: string;
  isActive: boolean;
  isOwner: boolean;
  tokenUri?: string;
}

interface PageProps {
  params: Promise<{ "subname": string }>;
}

export default function SubNameManagementPage({ params }: PageProps) {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const router = useRouter();
  const toast = useToast();

  const [subName, setSubName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subNameExists, setSubNameExists] = useState<boolean | null>(null);
  const [subNameData, setSubNameData] = useState<SubNameData | null>(null);

  const [transferAddress, setTransferAddress] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [odudeEnabled, setOdudeEnabled] = useState(false);
  const [updatingTokenUri, setUpdatingTokenUri] = useState(false);

  // Transaction Modal State
  const { isOpen: isTxModalOpen, onOpen: onTxModalOpen, onClose: onTxModalClose } = useDisclosure();
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txTitle, setTxTitle] = useState("");



  useEffect(() => {
    const getParams = async () => {
      try {
        const resolvedParams = await params;
        setSubName(decodeURIComponent(resolvedParams["subname"]));
      } catch (error) {
        console.error("Error resolving params:", error);
      }
    };
    getParams();
  }, [params]);

  const fetchSubNameData = async () => {
    if (!subName) return;

    setLoading(true);
    try {
      reconnectRPC();
      initializeSDK();

      if (!utils.isValidSubName(subName)) {
        throw new Error("Invalid sub-name. Only sub-names (e.g. name@tld) can be managed.");
      }

      if (!isSubNameSupported(subName)) {
        setUnsupported(true);
        setLoading(false);
        return;
      }


      const nameInfo = await sdk.getNameInfo(subName);

      if (!nameInfo || !nameInfo.exists) {
        throw new Error("Sub-name not found");
      }

      const owner = nameInfo.owner;
      const tokenId = nameInfo.tokenId;
      const isOwner = address ? owner?.toLowerCase() === address.toLowerCase() : false;

      setSubNameExists(true);

      let tokenUri = "";
      try {
        tokenUri = await sdk.registry().tokenURI(tokenId);
      } catch (uriErr) {
        console.warn("Failed to fetch tokenURI:", uriErr);
      }

      setSubNameData({
        name: subName,
        tokenId: BigInt(tokenId),
        owner,
        price: BigInt(0),
        commission: BigInt(0),
        erc20Token: ethers.ZeroAddress,
        isActive: true,
        isOwner,
        tokenUri,
      });

      // Update sync to Supabase: owner address and tokenuri
      if (owner && tokenId) {
        updateRecordSync(subName, owner, tokenId.toString(), tokenUri)
          .catch(err => console.error("Failed to update record sync:", err));
      }

      // Fetch Primary Name
      try {
        const reverseRecord = await sdk.resolver().getReverseRecord(address!);
        if (reverseRecord && reverseRecord.exists) {
          setPrimaryName(reverseRecord.primaryName);
        } else {
          setPrimaryName(null);
        }
      } catch (revErr) {
        console.warn("Failed to fetch reverse record:", revErr);
      }

      // Fetch Odude status
      try {
        const recordResult = await getRecord(subName);
        if (recordResult.success && recordResult.data) {
          setOdudeEnabled(Boolean(recordResult.data.odude));
        }
      } catch (err) {
        console.warn("Failed to fetch record status:", err);
      }
    } catch (error) {
      console.error("Error in fetchSubNameData:", error);
      const handledError = handleSDKError(error, "fetching data");
      if (handledError.message.includes("not found")) {
        setSubNameExists(false);
      } else {
        toast({
          title: "Fetch Error",
          description: handledError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && subName) {
      fetchSubNameData();
    }
  }, [isConnected, subName, address]);



  const handleTransfer = async () => {
    if (!subNameData || !walletClient || !transferAddress) return;

    setTxTitle(`Transferring ${subName}`);
    setTxStatus('signing');
    setTxHash(null);
    setTxError(null);
    onTxModalOpen();

    setTransferring(true);
    try {
      initializeSDK();
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      const networkKey = getODudeNetworkFromChainId(chainId);
      sdk.connectSigner(signer, networkKey || 'basesepolia');

      const tx = await sdk.registry().transferFrom(subNameData.owner, transferAddress, subNameData.tokenId);
      const hash = (typeof tx === "string" ? tx : tx?.hash) as string | undefined;

      if (hash) {
        setTxHash(hash);
        setTxStatus('pending');
      }

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      } else if (tx && typeof tx.wait === "function") {
        try {
          await tx.wait();
        } catch (waitErr) {
          console.warn("Wait failed:", waitErr);
        }
      }

      setTxStatus('success');
      toast({ title: "Success", description: "Transferred successfully", status: "success" });

      // Delay redirect to show success state
      setTimeout(() => {
        onTxModalClose();
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      const err = handleSDKError(error);
      setTxError(err.message);
      setTxStatus('error');
      toast({ title: "Error", description: err.message, status: "error" });
    } finally {
      setTransferring(false);
    }
  };

  const handleSetPrimaryName = async () => {
    if (!subNameData || !walletClient || !address || !chainId) return;

    setTxTitle(`Setting Primary Identity`);
    setTxStatus('signing');
    setTxHash(null);
    setTxError(null);
    onTxModalOpen();

    setIsSettingPrimary(true);
    try {
      initializeSDK();
      const networkKey = getODudeNetworkFromChainId(chainId);
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, networkKey || 'basesepolia');

      const tx = await sdk.registry().setReverse(subNameData.tokenId.toString());

      const hash = (typeof tx === "string" ? tx : tx?.hash) as string | undefined;
      if (hash) {
        setTxHash(hash);
        setTxStatus('pending');
      }

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      } else if (tx && typeof tx.wait === "function") {
        try {
          await tx.wait();
        } catch (waitErr) {
          console.warn("Wait failed:", waitErr);
        }
      }

      setTxStatus('success');
      toast({
        title: "Success",
        description: `${subName} is now your primary name!`,
        status: "success",
      });

      setPrimaryName(subName);

      setTimeout(() => {
        onTxModalClose();
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      const err = handleSDKError(error);
      setTxError(err.message);
      setTxStatus('error');
      console.error("Failed to set primary name:", error);
      toast({
        title: "Error",
        description: err.message,
        status: "error",
      });
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const handleUpdateTokenUri = async () => {
    if (!subNameData || !walletClient || !chainId) return;

    const targetUri = `https://endpoint.odude.com/api/${subName}`;

    // Check if already set
    if (subNameData.tokenUri === targetUri) {
      toast({
        title: "Already Set",
        description: "TokenURI is already pointed to ODude Endpoint.",
        status: "info",
      });
      return;
    }

    setTxTitle(`Upgrading to ODude NFT`);
    setTxStatus('signing');
    setTxHash(null);
    setTxError(null);
    onTxModalOpen();

    setUpdatingTokenUri(true);
    try {
      initializeSDK();
      const networkKey = getODudeNetworkFromChainId(chainId);
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, networkKey || 'basesepolia');

      const tx = await sdk.registry().setTokenURI(subNameData.tokenId.toString(), targetUri);

      const hash = (typeof tx === "string" ? tx : tx?.hash) as string | undefined;
      if (hash) {
        setTxHash(hash);
        setTxStatus('pending');
      }

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      } else if (tx && typeof tx.wait === "function") {
        await tx.wait();
      }

      setTxStatus('success');
      toast({
        title: "Success",
        description: "Your DScroll ID is now an NFT powered by ODude!",
        status: "success",
      });

      setSubNameData(prev => prev ? { ...prev, tokenUri: targetUri } : null);

      updateRecordSync(subName, address!, subNameData.tokenId.toString(), targetUri)
        .catch(err => console.error("Failed to update record sync:", err));

    } catch (error) {
      const err = handleSDKError(error);
      setTxError(err.message);
      setTxStatus('error');
      console.error("Failed to update tokenURI:", error);
      toast({
        title: "Update Failed",
        description: err.message,
        status: "error",
      });
    } finally {
      setUpdatingTokenUri(false);
    }
  };

  if (!isConnected) return (
    <Web3PageContainer>
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={6}>
          <Heading size="lg">Connect Wallet</Heading>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </VStack>
      </Flex>
    </Web3PageContainer>
  );

  if (loading) return (
    <Web3PageContainer>
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="xl" color="brand.400" />
      </Flex>
    </Web3PageContainer>
  );

  if (subNameExists === false) return (
    <Web3PageContainer>
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={6}>
          <Heading size="lg" color="orange.500">Not Found</Heading>
          <Button onClick={() => router.push("/whois")}>Search Names</Button>
        </VStack>
      </Flex>
    </Web3PageContainer>
  );

  if (unsupported) return (
    <Web3PageContainer>
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={6}>
          <Heading size="lg" color="red.500">Unsupported Domain</Heading>
          <Text color="gray.500">This TLD is not supported by this platform.</Text>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </VStack>
      </Flex>
    </Web3PageContainer>
  );


  if (!subNameData?.isOwner) return (
    <Web3PageContainer>
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={6}>
          <Heading size="lg" color="red.500">Access Denied</Heading>
          <Button onClick={() => router.back()}>Go Back</Button>
        </VStack>
      </Flex>
    </Web3PageContainer>
  );

  // We no longer need isSubName check since we only support sub-names
  // const isSubName = tldName.includes("@");

  return (
    <Web3PageContainer>
      <Box py={6} px={4}>
        <VStack align="stretch" spacing={6} maxW="1000px" mx="auto">
          <HStack justify="space-between">
            <HStack spacing={4}>
              <IconButton aria-label="Back" icon={<FiArrowLeft />} variant="ghost" onClick={() => router.back()} />
              <VStack align="start" spacing={0}>
                <Heading size="lg">Manage <Text as="span" color="brand.400">{subName}</Text></Heading>
                <Text color="gray.500" fontSize="xs">Ownership & Management</Text>
              </VStack>
            </HStack>
            <Badge colorScheme="green" px={4} py={1} borderRadius="full">
              Registered
            </Badge>
          </HStack>

          <SimpleGrid columns={{ base: 1, lg: 5 }} spacing={6}>
            <Box gridColumn={{ lg: "span 2" }}>
              <Card variant="outline" h="full">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack><Icon as={FiInfo} color="brand.400" /><Heading size="xs">INFO</Heading></HStack>
                    <Flex justify="space-between"><Text fontSize="xs">TOKEN ID</Text><Text fontSize="xs" fontFamily="mono">{subNameData.tokenId.toString()}</Text></Flex>
                    <Box><Text fontSize="xs">OWNER</Text><Text fontSize="xs" fontFamily="mono" isTruncated>{subNameData.owner}</Text></Box>
                    {subNameData.tokenUri && (
                      <Box>
                        <Text fontSize="xs">TOKEN URI</Text>
                        <Text fontSize="2xs" fontFamily="mono" color="gray.400" wordBreak="break-all" noOfLines={3}>
                          {subNameData.tokenUri}
                        </Text>
                        <NFTPreview url={subNameData.tokenUri} />
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </Box>

            <Box gridColumn={{ lg: "span 3" }}>
              <VStack align="stretch" spacing={4}>
                <Card variant="outline" borderColor="red.100">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack><Icon as={FiSend} color="red.400" /><Heading size="xs">TRANSFER</Heading></HStack>
                      <HStack>
                        <Input size="sm" value={transferAddress} onChange={(e) => setTransferAddress(e.target.value)} placeholder="Recipient address" />
                        <Button size="sm" colorScheme="red" onClick={handleTransfer} isLoading={transferring}>Transfer</Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                <Card variant="outline" borderColor={primaryName === subName ? "brand.200" : "gray.200"}>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between">
                        <HStack>
                          <Icon as={FiUser} color="brand.400" />
                          <Heading size="xs">PRIMARY IDENTITY</Heading>
                        </HStack>
                        {primaryName === subName && (
                          <Badge colorScheme="brand" variant="subtle" borderRadius="full">
                            Currently Set
                          </Badge>
                        )}
                      </HStack>

                      <Text fontSize="sm" color="gray.500">
                        A primary name allows dApps to display your name instead of your address.
                      </Text>

                      {primaryName === subName ? (
                        <Flex align="center" p={3} bg="brand.50" borderRadius="xl" border="1px solid" borderColor="brand.100">
                          <Icon as={FiCheckCircle} color="brand.500" mr={3} />
                          <Text fontSize="sm" fontWeight="medium" color="brand.700">
                            This name is currently your primary identity.
                          </Text>
                        </Flex>
                      ) : (
                        <VStack align="stretch" spacing={3}>
                          {primaryName && (
                            <Text fontSize="xs" color="orange.500" fontWeight="medium">
                              Note: This will replace your current primary name: <strong>{primaryName}</strong>
                            </Text>
                          )}
                          <Button
                            colorScheme="brand"
                            size="md"
                            borderRadius="xl"
                            onClick={handleSetPrimaryName}
                            isLoading={isSettingPrimary}
                            leftIcon={<FiUser />}
                          >
                            Set Primary name as {subName}
                          </Button>
                        </VStack>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card variant="outline" borderColor="brand.200">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack>
                        <Icon as={FiSave} color="brand.400" />
                        <Heading size="xs">OFF-CHAIN DATA</Heading>
                        <Badge colorScheme="purple" variant="subtle" borderRadius="full">New</Badge>
                      </HStack>

                      <Text fontSize="sm" color="gray.500">
                        Store additional information like your name and email off-chain.
                      </Text>

                      <Button
                        colorScheme="purple"
                        variant="solid"
                        size="md"
                        borderRadius="xl"
                        onClick={() => router.push(`/manage/subname/${subName}/record`)}
                        leftIcon={<FiSave />}
                      >
                        Manage Off-Chain Record
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                {odudeEnabled && (
                  <Card
                    variant="outline"
                    borderColor="purple.300"
                    bgGradient="linear(to-br, white, purple.50)"
                    _dark={{ bgGradient: "linear(to-br, gray.800, purple.900)" }}
                    overflow="hidden"
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      top="-10px"
                      right="-10px"
                      bg="purple.500"
                      color="white"
                      px={6}
                      py={4}
                      transform="rotate(15deg)"
                      fontSize="xs"
                      fontWeight="bold"
                      boxShadow="lg"
                    >
                      PREMIUM
                    </Box>
                    <CardBody>
                      <VStack align="stretch" spacing={5}>
                        <HStack spacing={3}>
                          <Image
                            src="/odude_logo.png"
                            alt="ODude Logo"
                            boxSize="40px"
                            objectFit="contain"
                            boxShadow="0 4px 12px rgba(128, 90, 213, 0.2)"
                            borderRadius="lg"
                          />
                          <VStack align="start" spacing={0}>
                            <Heading size="xs" color="purple.600" _dark={{ color: "purple.300" }}>ODUDE NFT POWERED</Heading>
                            <Text fontSize="2xs" color="gray.500" fontWeight="bold">EXCLUSIVE FEATURE</Text>
                          </VStack>
                        </HStack>

                        <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }} fontWeight="medium">
                          Your DScroll ID is eligible for the **ODude NFT** experience. Update your TokenURI to enable dynamic on-chain metadata.
                        </Text>

                        <Box
                          p={3}
                          bg="whiteAlpha.600"
                          _dark={{ bg: "blackAlpha.400" }}
                          borderRadius="xl"
                          border="1px dashed"
                          borderColor="purple.200"
                        >
                          <VStack align="stretch" spacing={1}>
                            <Text fontSize="2xs" fontWeight="bold" color="gray.500">NEW TOKEN URI</Text>
                            <Text fontSize="xs" fontFamily="mono" color="purple.600" isTruncated>
                              https://endpoint.odude.com/api/{subName}
                            </Text>
                          </VStack>
                        </Box>

                        <Button
                          colorScheme="purple"
                          size="lg"
                          borderRadius="xl"
                          h="60px"
                          onClick={handleUpdateTokenUri}
                          isLoading={updatingTokenUri}
                          loadingText="Updating NFT..."
                          leftIcon={<FiActivity />}
                          boxShadow="0 10px 20px -5px rgba(128, 90, 213, 0.4)"
                          _hover={{ transform: "translateY(-2px)", boxShadow: "0 15px 25px -5px rgba(128, 90, 213, 0.5)" }}
                          isDisabled={subNameData.tokenUri === `https://endpoint.odude.com/api/${subName}`}
                        >
                          {subNameData.tokenUri === `https://endpoint.odude.com/api/${subName}`
                            ? "NFT Powered Active"
                            : "Upgrade to ODude NFT"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </Box>
          </SimpleGrid>
        </VStack>
      </Box>

      {/* Transaction Status Modal */}
      <Modal isOpen={isTxModalOpen} onClose={txStatus === 'pending' || txStatus === 'signing' ? () => { } : onTxModalClose} isCentered size="sm">
        <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.600" />
        <ModalContent borderRadius="3xl" p={4} overflow="hidden">
          <ModalHeader textAlign="center" fontSize="xl" fontWeight="900">
            {txTitle}
          </ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={6}>
              {txStatus === 'signing' && (
                <VStack spacing={4}>
                  <Box position="relative">
                    <MotionBox
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      position="absolute"
                      top="-10px"
                      left="-10px"
                      right="-10px"
                      bottom="-10px"
                      bg="brand.400"
                      borderRadius="full"
                    />
                    <Flex bg="brand.500" color="white" p={6} borderRadius="full" boxShadow="xl" position="relative">
                      <Icon as={FiUser} boxSize={8} />
                    </Flex>
                  </Box>
                  <VStack spacing={1}>
                    <Text fontWeight="800">Awaiting Signature</Text>
                    <Text fontSize="xs" color="gray.500" textAlign="center">Please confirm the transaction in your wallet.</Text>
                  </VStack>
                </VStack>
              )}

              {txStatus === 'pending' && (
                <VStack spacing={4} w="full">
                  <Spinner size="xl" thickness="4px" speed="0.65s" color="brand.400" />
                  <VStack spacing={1}>
                    <Text fontWeight="800">Processing on Blockchain</Text>
                    <Text fontSize="xs" color="gray.500" textAlign="center">Transaction broadcasted.</Text>
                  </VStack>
                  {txHash && (
                    <Link
                      href={chainId === 84532 ? `https://sepolia.basescan.org/tx/${txHash}` : `https://basescan.org/tx/${txHash}`}
                      isExternal
                      fontSize="xs"
                      color="brand.500"
                      fontWeight="bold"
                    >
                      View on Explorer <Icon as={FiExternalLink} mx="2px" />
                    </Link>
                  )}
                  <Progress size="xs" isIndeterminate w="full" colorScheme="brand" borderRadius="full" />
                </VStack>
              )}

              {txStatus === 'success' && (
                <VStack spacing={4}>
                  <Flex bg="green.500" color="white" p={6} borderRadius="full" boxShadow="0 10px 20px rgba(72, 187, 120, 0.4)">
                    <Icon as={FiCheckCircle} boxSize={8} />
                  </Flex>
                  <VStack spacing={1}>
                    <Text fontWeight="900" color="green.600">Transaction Successful!</Text>
                    <Text fontSize="xs" color="gray.500">Your changes are now live on-chain.</Text>
                  </VStack>
                </VStack>
              )}

              {txStatus === 'error' && (
                <VStack spacing={4}>
                  <Flex bg="red.500" color="white" p={6} borderRadius="full" boxShadow="0 10px 20px rgba(245, 101, 101, 0.4)">
                    <Icon as={FiActivity} boxSize={8} />
                  </Flex>
                  <VStack spacing={1}>
                    <Text fontWeight="900" color="red.600">Transaction Failed</Text>
                    <Text fontSize="xs" color="gray.500" textAlign="center">{txError || "An unexpected error occurred."}</Text>
                  </VStack>
                  <Button size="sm" onClick={onTxModalClose} borderRadius="xl" px={8}>Close</Button>
                </VStack>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Web3PageContainer>
  );
}
