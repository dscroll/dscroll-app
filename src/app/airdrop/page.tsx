"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  IconButton,
  Button,
  Spinner,
  Badge,
  useToast,
  Icon,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tooltip,
} from "@chakra-ui/react";
import { useAccount, useWalletClient, useChainId } from "wagmi";
import { 
  FiFolder, 
  FiGift, 
  FiRefreshCw, 
  FiDatabase, 
  FiAlertCircle,
  FiCheckCircle,
  FiPlusCircle,
  FiClock,
  FiArchive,
  FiInfo
} from "react-icons/fi";
import Link from "next/link";
import { ethers } from "ethers";

import { sdk, initializeSDK, handleSDKError, getODudeNetworkFromChainId } from "@/lib/odude";
import { formatAddress, formatTokenAmount } from "@/utils/format";
import { executeTransaction } from "@/utils/transaction";
import Web3PageContainer from "@/components/Web3PageContainer";
import config from "@/config/config.json";


import "./airdrop.css";

// --- Types ---
interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
}

interface AirdropCampaign {
  id: number;
  tldName: string;
  tokenAddress: string;
  tokenInfo?: TokenInfo;
  totalAmount: bigint;
  perUserShare: bigint;
  remainingBalance: bigint;
  isActive: boolean;
  isWithdrawn: boolean;
  granter: string;
  createdAt: number;
  hasClaimed?: boolean;
  anyClaimed?: boolean;
}

export default function AirdropPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const networkKey = getODudeNetworkFromChainId(chainId) || 'basesepolia';
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [tlds, setTlds] = useState<string[]>([]);
  const [selectedTld, setSelectedTld] = useState<string | null>(null);
  const [airdrops, setAirdrops] = useState<AirdropCampaign[]>([]);
  const [loadingAirdrops, setLoadingAirdrops] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, boolean>>({});
  const [userDomains, setUserDomains] = useState<string[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unclaimed' | 'claimed' | 'withdrawn'>('unclaimed');
  const [isCached, setIsCached] = useState(false);
  const [cacheTime, setCacheTime] = useState<string | null>(null);
  
  // Confirmation state
  const { isOpen: isSyncOpen, onOpen: onSyncOpen, onClose: onSyncClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [selectedReward, setSelectedReward] = useState<AirdropCampaign | null>(null);
  const [isTldOwner, setIsTldOwner] = useState(false);
  const [claimingAll, setClaimingAll] = useState(false);
  const cancelRef = useRef<any>(null);


  // Caching helper: load data from cache
  const loadCache = () => {
    if (!address) return false;
    const cacheKey = `dscroll_airdrop_cache_${address.toLowerCase()}_${chainId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.tlds)) {
          setTlds(parsed.tlds);
          setUserDomains(parsed.userDomains ?? []);
          setSelectedTld(parsed.selectedTld ?? (parsed.tlds.length > 0 ? parsed.tlds[0] : null));
          
          if (parsed.selectedTld && parsed.airdropsByTld?.[parsed.selectedTld]) {
            setAirdrops(parsed.airdropsByTld[parsed.selectedTld]);
          }
          if (parsed.selectedTld && parsed.syncStatusByTld) {
            setSyncStatus(parsed.syncStatusByTld);
          }
          if (parsed.selectedTld && parsed.isTldOwnerByTld) {
            setIsTldOwner(!!parsed.isTldOwnerByTld[parsed.selectedTld]);
          }
          
          setIsCached(true);
          if (parsed.updatedAt) {
            const dateStr = new Date(parsed.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setCacheTime(dateStr);
          }
          return true;
        }
      }
    } catch (err) {
      console.warn("Failed to load airdrop cache:", err);
    }
    return false;
  };

  // Caching helper: update cached TLD data
  const updateAirdropCache = (tld: string, freshAirdrops: AirdropCampaign[], freshSyncStatus?: boolean, freshIsTldOwner?: boolean) => {
    if (!address) return;
    const cacheKey = `dscroll_airdrop_cache_${address.toLowerCase()}_${chainId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      let cacheData: any = {
        tlds,
        selectedTld: tld,
        userDomains,
        airdropsByTld: {},
        syncStatusByTld: {},
        isTldOwnerByTld: {},
        updatedAt: Date.now()
      };
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed) {
            cacheData.tlds = tlds.length > 0 ? tlds : parsed.tlds;
            cacheData.userDomains = userDomains.length > 0 ? userDomains : parsed.userDomains;
            cacheData.airdropsByTld = parsed.airdropsByTld || {};
            cacheData.syncStatusByTld = parsed.syncStatusByTld || {};
            cacheData.isTldOwnerByTld = parsed.isTldOwnerByTld || {};
          }
        } catch (_) {}
      }
      
      cacheData.selectedTld = tld;
      cacheData.airdropsByTld[tld] = freshAirdrops;
      cacheData.syncStatusByTld[tld] = freshSyncStatus !== undefined ? freshSyncStatus : (syncStatus[tld] ?? false);
      cacheData.isTldOwnerByTld[tld] = freshIsTldOwner !== undefined ? freshIsTldOwner : isTldOwner;
      cacheData.updatedAt = Date.now();
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (err) {
      console.warn("Failed to save airdrop cache:", err);
    }
  };

  // 1. Initial Scan: Get all owned names and extract TLDs
  useEffect(() => {
    if (isConnected && address) {
      const loaded = loadCache();
      if (!loaded) {
        scanWallet(false);
      }
    } else {
      setLoading(false);
      setTlds([]);
      setSelectedTld(null);
      setAirdrops([]);
      setUserDomains([]);
      setSyncStatus({});
      setIsTldOwner(false);
      setIsCached(false);
      setCacheTime(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const scanWallet = async (bypassCache = false) => {
    setLoading(true);
    if (bypassCache) {
      setIsCached(false);
      setCacheTime(null);
    }
    try {
      initializeSDK();
      const namesList = await sdk.getNamesList(address!);
      
      const domains = namesList.map((item: any) => typeof item === 'object' ? item.name : item);
      setUserDomains(domains);

      const uniqueTlds = Array.from(new Set(domains.map((name: string) => {
        if (!name) return null;
        const parts = name.split('@');
        return parts.length > 1 ? parts[1] : null;
      }).filter(Boolean))) as string[];
      
      setTlds(uniqueTlds);
      
      if (uniqueTlds.length > 0 && !selectedTld) {
        setSelectedTld(uniqueTlds[0]);
      }
    } catch (error) {
      console.error("Failed to scan wallet:", error);
      toast({
        title: "Scan Failed",
        description: handleSDKError(error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Airdrops when TLD changes
  useEffect(() => {
    if (selectedTld) {
      const cacheKey = `dscroll_airdrop_cache_${address?.toLowerCase()}_${chainId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.airdropsByTld?.[selectedTld]) {
            setAirdrops(parsed.airdropsByTld[selectedTld]);
            if (parsed.syncStatusByTld) {
              setSyncStatus(parsed.syncStatusByTld);
            }
            if (parsed.isTldOwnerByTld) {
              setIsTldOwner(!!parsed.isTldOwnerByTld[selectedTld]);
            }
            setIsCached(true);
            if (parsed.updatedAt) {
              const dateStr = new Date(parsed.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              setCacheTime(dateStr);
            }
            return; // Skip fetch, loaded successfully from cache
          }
        }
      } catch (err) {
        console.warn("Failed to load TLD cache:", err);
      }

      // If no cache or forced load, perform the fresh fetch
      setIsCached(false);
      setCacheTime(null);
      fetchAirdrops(selectedTld);
      checkSyncStatus(selectedTld);
      checkTldOwnership(selectedTld);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTld, userDomains]);

  const checkTldOwnership = async (tld: string) => {
    if (!address) return;
    try {
      initializeSDK();
      const tldId = await sdk.tld().getTLDId(tld);
      const owner = await sdk.tld().getTLDOwner(tldId);
      const isOwner = owner.toLowerCase() === address.toLowerCase();
      setIsTldOwner(isOwner);
      updateAirdropCache(tld, airdrops, syncStatus[tld] ?? false, isOwner);
    } catch (e) {
      console.error("Failed to check TLD ownership", e);
      setIsTldOwner(false);
    }
  };

  const fetchAirdrops = async (tld: string) => {
    setLoadingAirdrops(true);
    setAirdrops([]);
    try {
      initializeSDK();
      const count = await sdk.rwairdrop(networkKey).getTLDAirdropCount(tld);
      const airdropIndices = Array.from({ length: Number(count) }, (_, i) => i);
      
      const campaigns = await Promise.all(airdropIndices.map(async (i) => {
        const info = await sdk.rwairdrop(networkKey).getAirdropInfoByTLD(tld, i);
        
        // Fetch Token Info
        let tokenInfo: TokenInfo | undefined;
        try {
           const provider = sdk.getProvider(networkKey); 
           const contract = new ethers.Contract(info.tokenAddress, [
             "function symbol() view returns (string)",
             "function decimals() view returns (uint8)",
             "function name() view returns (string)"
           ], provider);
           const [name, symbol, decimals] = await Promise.all([
             contract.name(),
             contract.symbol(),
             contract.decimals()
           ]);
           tokenInfo = { name, symbol, decimals, address: info.tokenAddress };
        } catch (e) {
          tokenInfo = { name: "Unknown", symbol: "???", decimals: 18, address: info.tokenAddress };
        }

        // Check if user has ANY domain that CAN claim
        let hasClaimed = false;
        let unclaimedDomainCount = 0;
        const domainsInTld = userDomains.filter(d => d && d.endsWith(`@${tld}`));
        
        await Promise.all(domainsInTld.map(async (domain) => {
          try {
            const claimed = await sdk.rwairdrop(networkKey).hasDomainClaimed(domain, i);
            if (claimed) {
              hasClaimed = true;
            } else {
              unclaimedDomainCount++;
            }
          } catch (err) {
            console.warn(`Failed to check claim status for ${domain}`, err);
          }
        }));

        const allClaimed = domainsInTld.length > 0 && unclaimedDomainCount === 0;
        const anyClaimed = hasClaimed;

        return {
          id: i,
          tldName: tld,
          tokenAddress: info.tokenAddress,
          tokenInfo,
          totalAmount: info.totalAmount,
          perUserShare: info.perUserShare,
          remainingBalance: info.remainingBalance,
          isActive: info.isActive,
          isWithdrawn: info.isWithdrawn,
          granter: info.granter,
          createdAt: Number(info.createdAt),
          hasClaimed: allClaimed,
          anyClaimed: anyClaimed
        };
      }));

      // Sort by createdAt descending (latest first)
      const sortedCampaigns = campaigns.sort((a, b) => b.createdAt - a.createdAt);
      setAirdrops(sortedCampaigns);
      updateAirdropCache(tld, sortedCampaigns);

      // Successfully finished network fetch, mark as cached
      setIsCached(true);
      const dateStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setCacheTime(dateStr);
    } catch (error) {
      console.error("Failed to fetch airdrops:", error);
    } finally {
      setLoadingAirdrops(false);
    }
  };

  const checkSyncStatus = async (tld: string) => {
    if (!address) return;
    try {
      const syncedDomains = await sdk.rwairdrop(networkKey).getUserDomainsInTLD(address, tld);
      const localDomains = userDomains.filter(d => d && d.endsWith(`@${tld}`));
      const isSynced = localDomains.length > 0 && syncedDomains.length >= localDomains.length;
      
      setSyncStatus(prev => ({
        ...prev,
        [tld]: isSynced
      }));
      updateAirdropCache(tld, airdrops, isSynced, isTldOwner);
    } catch (e) {
      console.error("Sync check failed", e);
    }
  };

  const handleSync = async () => {
    onSyncClose();
    if (!selectedTld || !walletClient) return;
    setSyncing(selectedTld);
    try {
      initializeSDK();
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, networkKey);
      
      const localDomains = userDomains.filter(d => d && d.endsWith(`@${selectedTld}`));
      if (localDomains.length === 0) {
        toast({ title: "No Domains", description: `You don't own any domains in ${selectedTld}`, status: "warning" });
        return;
      }

      await executeTransaction(
        (sdk.rwairdrop(networkKey) as any).syncMyDomains(localDomains),
        toast,
        {
          loadingTitle: "Syncing Domains",
          loadingMessage: `Syncing your domains for ${selectedTld}...`,
          successTitle: "Sync Complete",
          successMessage: "Your domain ownership records are now up to date.",
          onSuccess: async () => {
            // Small delay to allow indexing
            await new Promise(r => setTimeout(r, 2000));
            checkSyncStatus(selectedTld);
          }
        }
      );
    } catch (error) {
      // Error handled by executeTransaction
    } finally {
      setSyncing(null);
    }
  };

  const handleClaim = async (airdrop: AirdropCampaign) => {
    if (!walletClient) return;
    setClaiming(airdrop.id);
    try {
      initializeSDK();
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, networkKey);

      // Find an eligible domain that hasn't claimed yet
      const domainsInTld = userDomains.filter(d => d && d.endsWith(`@${airdrop.tldName}`));
      let domainToUse = null;
      for (const domain of domainsInTld) {
        const claimed = await sdk.rwairdrop(networkKey).hasDomainClaimed(domain, airdrop.id);
        if (!claimed) {
          domainToUse = domain;
          break;
        }
      }

      if (!domainToUse) throw new Error("No eligible domain found to claim");

      onDetailClose(); // Close only after finding domain and being ready to execute
      
      await executeTransaction(
        (sdk.rwairdrop(networkKey) as any).claimShare(airdrop.tldName, airdrop.id, domainToUse),
        toast,
        {
          loadingTitle: "Claiming Airdrop",
          loadingMessage: `Claiming ${airdrop.tokenInfo?.symbol} rewards...`,
          successTitle: "Claim Successful",
          successMessage: `You received ${formatTokenAmount(airdrop.perUserShare, airdrop.tokenInfo?.decimals)} ${airdrop.tokenInfo?.symbol}`,
          onSuccess: async () => {
            await new Promise(r => setTimeout(r, 2000));
            fetchAirdrops(airdrop.tldName);
          }
        }
      );
    } catch (error) {
      console.error("Claim failed:", error);
      // toast handled by executeTransaction or manual catch
      if (!(error as any).txPromise) {
        toast({
          title: "Claim Failed",
          description: (error as any).message || "An unexpected error occurred",
          status: "error",
        });
      }
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimAll = async () => {
    if (!selectedTld || !walletClient) return;
    
    // Find all unclaimed airdrops for this TLD
    const unclaimedAirdrops = airdrops.filter(a => !a.hasClaimed && a.isActive && !a.isWithdrawn && a.remainingBalance > 0n);
    if (unclaimedAirdrops.length === 0) {
      toast({ title: "Nothing to claim", status: "info" });
      return;
    }

    setClaimingAll(true);
    try {
      initializeSDK();
      const provider = new ethers.BrowserProvider(walletClient!.transport as any);
      const signer = await provider.getSigner();
      sdk.connectSigner(signer, networkKey);

      toast({
        title: "Starting Batch Claim",
        description: `Processing ${unclaimedAirdrops.length} rewards. Please confirm each transaction.`,
        status: "info",
        duration: 3000
      });

      // Process them sequentially
      for (const airdrop of unclaimedAirdrops) {
        await handleClaim(airdrop);
      }
      
      toast({
        title: "Claiming Finished",
        description: "All possible claims have been processed.",
        status: "success"
      });
      
    } catch (error) {
      console.error("Claim all failed:", error);
    } finally {
      setClaimingAll(false);
    }
  };



  const filteredAirdrops = airdrops.filter(reward => {
    if (activeTab === 'unclaimed') return !reward.hasClaimed && !reward.isWithdrawn;
    if (activeTab === 'claimed') return reward.anyClaimed;
    if (activeTab === 'withdrawn') return reward.isWithdrawn;
    return true;
  });

  return (
    <Web3PageContainer maxW="1400px">
      <Box className="airdrop-explorer">
        {/* Sidebar */}
        <Box className="explorer-sidebar">
          <Box className="sidebar-header">
            <HStack justify="space-between">
              <Heading size="xs" color="gray.500" letterSpacing="widest">{config.airdrop_ui.namespaces_label}</Heading>

              <HStack spacing={1}>
                <IconButton 
                  aria-label="Sync All" 
                  icon={<FiRefreshCw />} 
                  size="xs" 
                  variant="ghost" 
                  onClick={onSyncOpen}
                  title="Sync Ownership"
                />
                <IconButton 
                  aria-label="Refresh" 
                  icon={<FiDatabase />} 
                  size="xs" 
                  variant="ghost" 
                  onClick={() => scanWallet(true)} 
                  isLoading={loading}
                  title="Refresh Wallet"
                />
              </HStack>
            </HStack>
          </Box>
          <Box className="tld-list">
            {tlds.map(tld => (
              <Box 
                key={tld} 
                className={`tld-item ${selectedTld === tld ? 'active' : ''}`}
                onClick={() => setSelectedTld(tld)}
              >
                <Icon as={FiFolder} className="tld-icon" />
                <Text fontSize="sm" isTruncated>{tld}</Text>
              </Box>
            ))}
            {tlds.length === 0 && !loading && (
              <VStack py={10} opacity={0.5}>
                <Icon as={FiDatabase} fontSize="24px" />
                <Text fontSize="xs">{config.airdrop_ui.no_tlds_found}</Text>

              </VStack>
            )}
          </Box>
          <Box p={4} borderTop="1px solid rgba(255,255,255,0.05)">
             <Link href={selectedTld ? `/airdrop/create/${selectedTld}` : "/airdrop/create/general"}>
               <Button size="sm" w="full" colorScheme="blue" leftIcon={<FiPlusCircle />} variant="outline" borderRadius="xl">
                 {config.airdrop_ui.create_button}
               </Button>

             </Link>
          </Box>
        </Box>
        
        {/* Main Content */}
        <Box className="explorer-content">
          {/* Header & Path */}
          <Box className="content-header">
            <VStack align="flex-start" spacing={1}>
              <Box className="content-path" display="flex" alignItems="center" flexWrap="wrap">
                <Icon as={FiDatabase} mr={2} />
                <span>root</span>
                <span className="path-separator">/</span>
                <span>airdrops</span>
                {selectedTld && (
                  <>
                    <span className="path-separator">/</span>
                    <span style={{ color: '#fff' }}>{selectedTld}</span>
                    {isCached && (
                      <Tooltip label={cacheTime ? `Loaded from local cache (saved at ${cacheTime}). Click refresh to check for updates.` : "Loaded from local cache. Click refresh to check for updates."}>
                        <Badge
                          colorScheme="orange"
                          variant="subtle"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          fontSize="10px"
                          fontWeight="bold"
                          display="inline-flex"
                          alignItems="center"
                          gap={1}
                          ml={3}
                          verticalAlign="middle"
                        >
                          <Icon as={FiClock} boxSize={2.5} />
                          Cached
                        </Badge>
                      </Tooltip>
                    )}
                  </>
                )}
              </Box>
              <HStack spacing={4} mt={2}>
                <Box 
                  className={`tab-item ${activeTab === 'unclaimed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('unclaimed')}
                >
                  <Icon as={FiClock} mr={2} />
                  {config.airdrop_ui.tabs.unclaimed}
                </Box>

                <Box 
                  className={`tab-item ${activeTab === 'claimed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('claimed')}
                >
                  <Icon as={FiCheckCircle} mr={2} />
                  {config.airdrop_ui.tabs.claimed}
                </Box>

                <Box 
                  className={`tab-item ${activeTab === 'withdrawn' ? 'active' : ''}`}
                  onClick={() => setActiveTab('withdrawn')}
                >
                  <Icon as={FiArchive} mr={2} />
                  {config.airdrop_ui.tabs.withdrawn}
                </Box>

              </HStack>
            </VStack>
            <HStack spacing={3}>
               {selectedTld && (
                 <Button 
                   leftIcon={loadingAirdrops ? <Spinner size="xs" /> : <FiRefreshCw />} 
                   size="sm" 
                   variant="ghost" 
                   colorScheme="blue" 
                   onClick={() => {
                     setIsCached(false);
                     setCacheTime(null);
                     fetchAirdrops(selectedTld);
                     checkSyncStatus(selectedTld);
                     checkTldOwnership(selectedTld);
                   }}
                   isLoading={loadingAirdrops}
                 >
                   Refresh
                 </Button>
               )}

               <Button 
                 leftIcon={<FiRefreshCw />} 
                 size="sm" 
                 variant="ghost" 
                 colorScheme="blue" 
                 onClick={onSyncOpen}
                 isLoading={syncing === selectedTld}
                 display={{ base: 'none', md: 'flex' }}
               >
                 {config.airdrop_ui.sync.button}
               </Button>

               <Badge colorScheme="blue" variant="subtle" borderRadius="full" px={3}>
                 {filteredAirdrops.length} Reward{filteredAirdrops.length !== 1 ? 's' : ''}
               </Badge>
            </HStack>
          </Box>

          {/* Sync Banner */}
          {selectedTld && syncStatus[selectedTld] === false && (
            <Box className="sync-banner">
              <HStack>
                <Icon as={FiAlertCircle} />
                <Text fontSize="sm">Ownership record for <b>{selectedTld}</b> {config.airdrop_ui.sync.banner}</Text>

              </HStack>
              <Button 
                size="sm" 
                colorScheme="yellow" 
                onClick={onSyncOpen} 
                isLoading={syncing === selectedTld}
                leftIcon={<FiRefreshCw />}
                borderRadius="lg"
              >
                {config.airdrop_ui.sync.now}
              </Button>

            </Box>
          )}

          {/* Main Grid */}
          <Box className="airdrop-grid" minH="0">
            {loadingAirdrops ? (
              <Flex direction="column" align="center" justify="center" w="full" h="300px" gridColumn="1 / -1">
                <Spinner size="xl" color="blue.500" thickness="4px" />
                <Text mt={4} color="gray.500" fontWeight="medium">{config.airdrop_ui.scanning_text}</Text>

              </Flex>
            ) : filteredAirdrops.length > 0 ? (
              filteredAirdrops.map((reward, i) => (
                <Box 
                  key={i} 
                  className="reward-card" 
                  onClick={() => {
                    setSelectedReward(reward);
                    onDetailOpen();
                  }}
                  cursor="pointer"
                >
                  <Box className="reward-token-info">
                    <Box className="token-icon-circle">
                      {reward.tokenInfo?.symbol[0] || <FiGift />}
                    </Box>
                    <Box className="token-details">
                      <Heading size="sm" color="white">{reward.tokenInfo?.symbol} Reward</Heading>
                      <Text fontSize="xs" color="gray.500">{formatAddress(reward.tokenAddress)}</Text>
                    </Box>
                    <Box ml="auto">
                       {reward.hasClaimed && (
                         <Icon as={FiCheckCircle} color="green.400" fontSize="24px" />
                       )}
                       {reward.isWithdrawn && (
                         <Badge colorScheme="red">Withdrawn</Badge>
                       )}
                    </Box>
                  </Box>

                  <Box className="reward-stats">
                    <Box className="stat-box">
                      <Text className="stat-label">Your Share</Text>
                      <Text className="stat-value">
                        {formatTokenAmount(reward.perUserShare, reward.tokenInfo?.decimals)}
                      </Text>
                    </Box>
                    <Box className="stat-box">
                      <Text className="stat-label">Remaining</Text>
                      <Text className="stat-value">
                        {formatTokenAmount(reward.remainingBalance, reward.tokenInfo?.decimals)}
                      </Text>
                    </Box>
                  </Box>

                  <Box className="claim-action">
                    <Button
                      className="btn-claim"
                      variant="ghost"
                      size="sm"
                      rightIcon={<FiPlusCircle />}
                    >
                      {config.airdrop_ui.view_details}
                    </Button>

                  </Box>
                </Box>
              ))
            ) : (
              <Box className="empty-state" gridColumn="1 / -1">
                <Icon as={FiGift} className="empty-icon" />
                <Heading size="md" color="gray.600">No {activeTab === 'unclaimed' ? config.airdrop_ui.tabs.unclaimed : activeTab === 'claimed' ? config.airdrop_ui.tabs.claimed : config.airdrop_ui.tabs.withdrawn} Rewards</Heading>

                <Text color="gray.500">
                  {activeTab === 'unclaimed' 
                    ? config.airdrop_ui.empty_states.unclaimed
                    : activeTab === 'claimed' 
                    ? config.airdrop_ui.empty_states.claimed 
                    : config.airdrop_ui.empty_states.withdrawn}

                </Text>
              </Box>
            )}
          </Box>

          {/* Bottom Action Bar */}
          {activeTab === 'unclaimed' && filteredAirdrops.length > 0 && (
            <Box className="content-footer">
               <HStack justify="space-between" w="full">
                 <Text fontSize="xs" color="gray.500">
                   {filteredAirdrops.length} unclaimed rewards available in <b>{selectedTld}</b>
                 </Text>
                 <Button 
                   colorScheme="blue" 
                   size="md" 
                   leftIcon={<FiGift />} 
                   onClick={handleClaimAll}
                   isLoading={claimingAll}
                   borderRadius="xl"
                   px={10}
                   boxShadow="0 4px 14px 0 rgba(49, 130, 206, 0.39)"
                 >
                   {config.airdrop_ui.claim_all}
                 </Button>

               </HStack>
            </Box>
          )}
        </Box>
      </Box>

      {/* Confirmation Dialogs */}
      <AlertDialog
        isOpen={isSyncOpen}
        leastDestructiveRef={cancelRef}
        onClose={onSyncClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800" color="white" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {config.airdrop_ui.sync.dialog_title}
            </AlertDialogHeader>


            <AlertDialogBody>
              This will update the airdrop contract with your current domain ownership records for <b>{selectedTld}</b>. 
              This is required once per domain to be eligible for rewards.
              <Box mt={4} p={3} bg="blueAlpha.200" borderRadius="md" fontSize="sm">
                <Icon as={FiRefreshCw} mr={2} />
                One transaction will be required to sync your domains.
              </Box>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onSyncClose} variant="ghost" color="gray.400">
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleSync} ml={3} borderRadius="lg">
                {config.airdrop_ui.sync.dialog_proceed}
              </Button>

            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isDetailOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDetailClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.900" color="white" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.200" maxW="500px">
            <AlertDialogHeader fontSize="xl" fontWeight="bold" borderBottom="1px solid" borderColor="whiteAlpha.100" pb={4}>
               <HStack>
                 <Box p={2} bg="blue.500" borderRadius="lg">
                   <FiGift color="white" />
                 </Box>
                 <Text>{selectedReward?.tokenInfo?.symbol} Airdrop Details</Text>
               </HStack>
            </AlertDialogHeader>

            <AlertDialogBody py={6}>
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Text color="gray.500" fontSize="xs" mb={1} textTransform="uppercase">Token Contract</Text>
                  <Text fontFamily="mono" fontSize="sm" isTruncated>{selectedReward?.tokenAddress}</Text>
                </Box>

                <Box>
                  <Text color="gray.500" fontSize="xs" mb={1} textTransform="uppercase">Granter</Text>
                  <Text fontFamily="mono" fontSize="sm" isTruncated>{selectedReward?.granter}</Text>
                </Box>

                <Box>
                  <Text color="gray.500" fontSize="xs" mb={1} textTransform="uppercase">Created At</Text>
                  <Text fontSize="sm">
                    {selectedReward?.createdAt ? new Date(selectedReward.createdAt * 1000).toLocaleString() : 'N/A'}
                  </Text>
                </Box>

                <HStack spacing={4}>
                  <Box flex={1} bg="whiteAlpha.50" p={4} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
                    <Text color="gray.500" fontSize="xs" mb={1}>PER DOMAIN SHARE</Text>
                    <Text fontSize="lg" fontWeight="bold">
                      {selectedReward && formatTokenAmount(selectedReward.perUserShare, selectedReward.tokenInfo?.decimals)}
                    </Text>
                  </Box>
                  <Box flex={1} bg="whiteAlpha.50" p={4} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
                    <Text color="gray.500" fontSize="xs" mb={1}>REMAINING POOL</Text>
                    <Text fontSize="lg" fontWeight="bold">
                      {selectedReward && formatTokenAmount(selectedReward.remainingBalance, selectedReward.tokenInfo?.decimals)}
                    </Text>
                  </Box>
                </HStack>

                <Box bg="blueAlpha.100" p={4} borderRadius="xl" border="1px solid" borderColor="blueAlpha.200">
                  <HStack align="flex-start" spacing={3}>
                    <Icon as={FiInfo} color="blue.400" mt={1} />
                    <VStack align="flex-start" spacing={1}>
                      <Text fontWeight="semibold" fontSize="sm">{config.airdrop_ui.how_to_claim}</Text>

                      <Text fontSize="xs" color="gray.400">
                        You need to own a sub-name under <b>@{selectedTld}</b>. Each domain you own allows you to claim the share once. 
                        Make sure your domains are <b>synced</b> before claiming.
                      </Text>
                    </VStack>
                  </HStack>
                </Box>

                {selectedReward && syncStatus[selectedTld!] === false && (
                   <Box bg="yellowAlpha.100" p={3} borderRadius="lg" border="1px solid" borderColor="yellowAlpha.300">
                     <HStack>
                       <Icon as={FiAlertCircle} color="yellow.400" />
                       <Text fontSize="xs" color="yellow.200">Domain sync required before claiming.</Text>
                     </HStack>
                   </Box>
                )}
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter borderTop="1px solid" borderColor="whiteAlpha.100" pt={4}>
              <Button ref={cancelRef} onClick={onDetailClose} variant="ghost" color="gray.400">
                Close
              </Button>
              


              {activeTab === 'unclaimed' && (
                <Button 
                  colorScheme="blue" 
                  onClick={() => selectedReward && handleClaim(selectedReward)} 
                  ml={3} 
                  borderRadius="lg"
                  px={8}
                  isLoading={claiming === selectedReward?.id}
                  isDisabled={selectedReward?.hasClaimed || selectedReward?.remainingBalance === 0n || !selectedReward?.isActive || syncStatus[selectedTld!] === false}
                >
                  {selectedReward?.hasClaimed ? config.airdrop_ui.already_claimed : config.airdrop_ui.claim_now}
                </Button>

              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Web3PageContainer>
  );
}
