"use client";

import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  Spinner,
  Icon,
  Button,
  useColorModeValue,
  Flex,
  Tooltip,
  LinkBox,
  LinkOverlay,
  useToast,
  Divider,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId, useWalletClient, usePublicClient } from "wagmi";
import { FiRefreshCw, FiAlertCircle, FiGlobe, FiTag, FiExternalLink, FiUser, FiArrowRight, FiClock } from "react-icons/fi";
import { sdk, initializeSDK, handleSDKError, getODudeNetworkFromChainId, reconnectRPC } from "@/lib/odude";
import { isSubNameSupported } from "@/utils/domain";
import config from "@/config/config.json";



const MotionBox = motion(Box);

interface NameItem {
  name: string;
  tokenId: string;
  type: "TLD" | "Sub-name";
}

import Link from "next/link";
import Web3PageContainer from "@/components/Web3PageContainer";
import { syncRecords } from "@/app/actions/records";

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [names, setNames] = useState<NameItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [primaryTokenId, setPrimaryTokenId] = useState<string | null>(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cacheTime, setCacheTime] = useState<string | null>(null);
  const toast = useToast();

  // Filter only Sub-names (contains @ sign) and supported TLDs
  const subNames = useMemo(() => names.filter((n) => n.name.includes("@") && isSubNameSupported(n.name)), [names]);


  const fetchNames = async (isRefresh = false) => {
    if (!address) return;

    // Check if we have cached data first when NOT performing a manual refresh
    if (!isRefresh) {
      const cacheKey = `dscroll_dashboard_cache_${address.toLowerCase()}_${chainId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.names)) {
            setNames(parsed.names);
            setPrimaryName(parsed.primaryName ?? null);
            setPrimaryTokenId(parsed.primaryTokenId ?? null);
            setIsCached(true);
            if (parsed.updatedAt) {
              const dateStr = new Date(parsed.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              setCacheTime(dateStr);
            }
            setLoading(false);
            return;
          }
        }
      } catch (cacheErr) {
        console.warn("Failed to read from dashboard cache:", cacheErr);
      }
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Ensure we have a fresh RPC connection for read operations
      // especially if we were previously using a signer for transactions
      reconnectRPC();
      initializeSDK(isRefresh);

      // Connect to the current network based on chainId
      if (chainId) {
        const networkKey = getODudeNetworkFromChainId(chainId);
        if (networkKey) {
          try {
            sdk.connectNetwork(networkKey);
          } catch (err) {
            console.warn(`Network ${networkKey} not supported by SDK:`, err);
          }
        }
      }

      // Get list of names owned by the user
      const namesList = await sdk.getNamesList(address);

      const mappedNames: NameItem[] = namesList.map((item: { tokenId: string; name: string }) => ({
        name: item.name,
        tokenId: item.tokenId,
        type: item.name.includes("@") ? "Sub-name" : "TLD",
      }));

      setNames(mappedNames);

      // Sync sub-names to Supabase
      if (address && mappedNames.length > 0) {
        const subnamesToSync = mappedNames
          .filter(n => n.type === "Sub-name")
          .map(n => ({
            subname: n.name,
            walletAddress: address,
            tokenid: n.tokenId
          }));
        
        if (subnamesToSync.length > 0) {
          syncRecords(subnamesToSync).catch(err => console.error("Failed to sync records to DB:", err));
        }
      }

      // Fetch Primary Name
      let fetchedPrimaryName: string | null = null;
      let fetchedPrimaryTokenId: string | null = null;
      try {
        const reverseRecord = await sdk.resolver().getReverseRecord(address);
        if (reverseRecord && reverseRecord.exists) {
          fetchedPrimaryName = reverseRecord.primaryName;
          fetchedPrimaryTokenId = reverseRecord.primaryTokenId.toString();
        }
      } catch (revErr) {
        console.warn("Failed to fetch reverse record:", revErr);
      }

      setPrimaryName(fetchedPrimaryName);
      setPrimaryTokenId(fetchedPrimaryTokenId);
      setIsCached(false);
      setCacheTime(null);

      // Save to localStorage cache
      try {
        const cacheKey = `dscroll_dashboard_cache_${address.toLowerCase()}_${chainId}`;
        const cacheData = {
          names: mappedNames,
          primaryName: fetchedPrimaryName,
          primaryTokenId: fetchedPrimaryTokenId,
          updatedAt: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (cacheSaveErr) {
        console.warn("Failed to save dashboard to cache:", cacheSaveErr);
      }
    } catch (err) {
      console.error("Failed to fetch names:", err);
      const handledError = handleSDKError(err, "fetching sub-names");
      setError(handledError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchNames();
    } else {
      setLoading(false);
      setNames([]);
      setPrimaryName(null);
      setPrimaryTokenId(null);
      setIsCached(false);
      setCacheTime(null);
    }
  }, [isConnected, address, chainId]);

  const handleSetPrimaryName = async (tokenId: string, name: string) => {
    if (!address || !chainId || !walletClient) return;
    
    setIsSettingPrimary(true);
    try {
      initializeSDK();
      const networkKey = getODudeNetworkFromChainId(chainId);
      if (networkKey) {
        sdk.connectNetwork(networkKey);
      }

      // Connect signer to SDK
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, networkKey || 'basesepolia');
      
      const tx = await sdk.registry().setReverse(tokenId);
      
      toast({
        title: "Transaction Sent",
        description: `Setting ${name} as your primary name...`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });

      const txHash = (typeof tx === "string" ? tx : tx?.hash) as `0x${string}` | undefined;
      
      if (txHash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else if (tx && typeof tx.wait === "function") {
        try {
          await tx.wait();
        } catch (waitErr) {
          console.warn("Wait failed:", waitErr);
        }
      }

      toast({
        title: "Success",
        description: `${name} is now your primary name!`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Refresh data
      fetchNames(true);
    } catch (err) {
      console.error("Failed to set primary name:", err);
      toast({
        title: "Error",
        description: handleSDKError(err).message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const bgColor = useColorModeValue("white", "rgba(255, 255, 255, 0.03)");
  const borderColor = useColorModeValue("gray.200", "rgba(255, 255, 255, 0.1)");
  const cardHoverBg = useColorModeValue("brand.50", "rgba(56, 178, 172, 0.1)");
  const badgeBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const primaryNameBg = useColorModeValue("brand.50", "brand.900");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const headingColor = useColorModeValue("gray.700", "white");

  return (
    <Web3PageContainer>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="flex-end" wrap="wrap" gap={4}>
          <VStack align="start" spacing={2}>
            <HStack align="center" spacing={3}>
              <Icon as={FiGlobe} color="brand.400" boxSize={8} />
              <Heading size="xl" letterSpacing="tight" bgGradient="linear(to-r, brand.400, accent.400)" bgClip="text">
                {config.dashboard_ui.title}
              </Heading>
              {isCached && (
                <Tooltip label={cacheTime ? `Loaded from local cache (saved at ${cacheTime}). Click refresh to check for updates.` : "Loaded from local cache. Click refresh to check for updates."}>
                  <Badge
                    colorScheme="orange"
                    variant="subtle"
                    px={2.5}
                    py={1}
                    borderRadius="lg"
                    fontSize="xs"
                    fontWeight="bold"
                    display="inline-flex"
                    alignItems="center"
                    gap={1.5}
                    mt={1}
                  >
                    <Icon as={FiClock} boxSize={3.5} />
                    Cached
                  </Badge>
                </Tooltip>
              )}
            </HStack>
            <Text color="gray.500" fontSize="md" fontWeight="medium">
              {config.dashboard_ui.description}
            </Text>

          </VStack>

          <Button
            leftIcon={refreshing ? <Spinner size="xs" /> : <FiRefreshCw />}
            onClick={() => fetchNames(true)}
            isLoading={refreshing}
            variant="glass"
            size="md"
            borderRadius="xl"
            isDisabled={!isConnected}
          >
            {config.dashboard_ui.refresh_button}
          </Button>

        </Flex>

        {isConnected && !loading && !error && (
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            px={5}
            py={3}
            bg={bgColor}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="sm"
            position="relative"
            overflow="hidden"
          >
            {/* Subtle Gradient Decoration */}
            <Box
              position="absolute"
              top="-20px"
              right="-20px"
              w="150px"
              h="150px"
              bgGradient="radial(brand.400, transparent)"
              opacity="0.05"
              borderRadius="full"
              pointerEvents="none"
            />

            <Flex align="center" justify="space-between" wrap="wrap" gap={6}>
              <HStack spacing={3} minW="fit-content">
                <Box p={2} bg={primaryNameBg} borderRadius="lg">
                  <Icon as={FiUser} color="brand.400" boxSize={5} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" fontWeight="black" color="brand.400" textTransform="uppercase" letterSpacing="widest">
                    {config.dashboard_ui.primary_identity.label}
                  </Text>

                  <Text fontSize="sm" color={mutedText} display={{ base: "none", md: "block" }}>
                    {config.dashboard_ui.primary_identity.description}
                  </Text>

                </VStack>
              </HStack>

              <HStack spacing={4} flex={1} justify={{ base: "start", md: "center" }} minW="280px">
                <Tooltip label="Wallet Address">
                  <Box 
                    px={3} 
                    py={1.5} 
                    bg={badgeBg} 
                    borderRadius="xl" 
                    fontFamily="mono" 
                    fontSize="sm" 
                    border="1px solid" 
                    borderColor={borderColor}
                  >
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </Box>
                </Tooltip>
                
                <Icon as={FiArrowRight} color="brand.400" boxSize={5} />
                
                <Tooltip label={primaryName ? "Active Primary Name" : "No Primary Name Set"}>
                  <Box 
                    px={4} 
                    py={1.5} 
                    bgGradient={primaryName ? "linear(to-r, brand.400, brand.600)" : "none"}
                    bg={primaryName ? undefined : badgeBg}
                    color={primaryName ? "white" : "gray.500"}
                    borderRadius="xl" 
                    fontWeight="bold" 
                    fontSize="sm"
                    boxShadow={primaryName ? "0 4px 12px rgba(56, 178, 172, 0.3)" : "none"}
                    border={primaryName ? "none" : "1px dashed"}
                    borderColor={primaryName ? "none" : "gray.300"}
                  >
                    {primaryName ? primaryName : config.dashboard_ui.primary_identity.not_set}
                  </Box>

                </Tooltip>
              </HStack>

              <HStack spacing={3}>
                {primaryName ? (
                  <Badge colorScheme="brand" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                    {config.dashboard_ui.primary_identity.active}
                  </Badge>

                ) : (
                  <Text fontSize="xs" color="gray.400" fontStyle="italic">
                    {config.dashboard_ui.primary_identity.configure_description}
                  </Text>

                )}
              </HStack>
            </Flex>
          </MotionBox>
        )}

        {!isConnected ? (
          <Flex direction="column" align="center" justify="center" py={20} bg={bgColor} borderRadius="3xl" border="1px dashed" borderColor={borderColor}>
            <Icon as={FiAlertCircle} boxSize={12} color="gray.400" mb={4} />
            <Heading size="md" color="gray.500" mb={2}>{config.dashboard_ui.wallet_not_connected.title}</Heading>
            <Text color="gray.400">{config.dashboard_ui.wallet_not_connected.description}</Text>

          </Flex>
        ) : loading ? (
          <Flex justify="center" align="center" py={40}>
            <Spinner size="xl" thickness="4px" speed="0.65s" emptyColor="gray.200" color="brand.500" />
          </Flex>
        ) : error ? (
          <MotionBox
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={16}
            px={8}
            bg={useColorModeValue("white", "whiteAlpha.50")}
            borderRadius="3xl"
            border="1px solid"
            borderColor={useColorModeValue("red.100", "red.900")}
            boxShadow="xl"
            textAlign="center"
          >
            <Box
              mb={6}
              p={4}
              bg="red.50"
              color="red.500"
              borderRadius="full"
              display="inline-block"
            >
              <Icon as={FiAlertCircle} boxSize={10} />
            </Box>
            <Heading size="lg" color={useColorModeValue("red.700", "red.400")} mb={4}>
              {config.dashboard_ui.error_state.title}
            </Heading>

            <Text color={useColorModeValue("gray.600", "gray.400")} maxW="md" mx="auto" mb={8} fontSize="lg">
              {error}
            </Text>
            <HStack spacing={4} justify="center">
              <Button
                leftIcon={<FiRefreshCw />}
                colorScheme="red"
                size="lg"
                px={8}
                borderRadius="xl"
                onClick={() => fetchNames(true)}
                boxShadow="0 4px 14px rgba(229, 62, 62, 0.4)"
                _hover={{ transform: "translateY(-2px)" }}
              >
                {config.dashboard_ui.error_state.try_again}
              </Button>

              <Button
                variant="outline"
                size="lg"
                borderRadius="xl"
                onClick={() => window.location.reload()}
              >
                {config.dashboard_ui.error_state.refresh_page}
              </Button>

            </HStack>
          </MotionBox>
        ) : subNames.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py={20} bg={bgColor} borderRadius="3xl" border="1px dashed" borderColor={borderColor}>
            <Icon as={FiTag} boxSize={12} color="gray.400" mb={4} />
            <Heading size="md" color="gray.500" mb={2}>{config.dashboard_ui.no_names_found.title}</Heading>
            <Text color="gray.400">{config.dashboard_ui.no_names_found.description}</Text>

          </Flex>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            <AnimatePresence>
              {subNames.map((item, index) => (
                <MotionBox
                  key={item.tokenId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -10, transition: { duration: 0.2 } }}
                >
                  <LinkBox
                    p={5}
                    bg={bgColor}
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor={borderColor}
                    boxShadow="lg"
                    position="relative"
                    overflow="hidden"
                    _hover={{
                      borderColor: "brand.400",
                      bg: cardHoverBg,
                      boxShadow: "0 10px 20px rgba(56, 178, 172, 0.1)",
                      transform: "translateY(-4px)",
                    }}
                    transition="all 0.2s ease"
                    cursor="pointer"
                  >
                    {/* Background Accent */}
                    <Box
                      position="absolute"
                      top="-20px"
                      right="-20px"
                      w="100px"
                      h="100px"
                      bgGradient="radial(brand.400, transparent)"
                      opacity="0.1"
                      borderRadius="full"
                    />

                    <VStack align="start" spacing={4}>
                      <HStack w="full" justify="space-between">
                        <Badge
                          px={3}
                          py={1}
                          borderRadius="full"
                          colorScheme="brand"
                          variant="subtle"
                          fontSize="xs"
                          fontWeight="bold"
                          letterSpacing="wider"
                        >
                          Sub-name
                        </Badge>
                      </HStack>

                      <VStack align="start" spacing={1}>
                        <LinkOverlay as={Link} href={`/manage/subname/${item.name}`}>
                          <Text fontSize="3xl" fontWeight="900" letterSpacing="tighter" lineHeight="1.1" color="brand.500">
                            {item.name}
                          </Text>
                        </LinkOverlay>
                        <Text fontSize="xs" color="gray.500" fontFamily="mono" isTruncated w="full">
                          ID: {item.tokenId}
                        </Text>
                      </VStack>

                      <HStack w="full" pt={4}>
                        <Button
                          flex={1}
                          size="md"
                          colorScheme="teal"
                          borderRadius="xl"
                          boxShadow="0 4px 12px rgba(56, 178, 172, 0.3)"
                        >
                          {config.dashboard_ui.manage_button}
                        </Button>

                      </HStack>
                    </VStack>
                  </LinkBox>
                </MotionBox>
              ))}
            </AnimatePresence>
          </SimpleGrid>
        )}
      </VStack>
    </Web3PageContainer>
  );
}
