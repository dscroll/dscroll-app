"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Button,
  useColorModeValue,
  SimpleGrid,
  Badge,
  Spinner,
  Link,
  useToast,
  Divider,
} from "@chakra-ui/react";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle, 
  FiExternalLink, 
  FiDatabase, 
  FiShield, 
  FiGlobe,
  FiZap,
  FiRefreshCw
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/config/config";

interface SetupStatus {
  walletConnect: boolean;
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceKey: boolean;
  databaseUrl: boolean;
  isSingleChainConfigured: boolean;
  isAllConfigured: boolean;
}

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup-status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch setup status", err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/validate-setup", { 
        method: "POST",
        cache: "no-store" 
      });
      const data = await res.json();
      
      if (data.success) {
        setIsValidated(true);
        toast({
          title: "Validation Successful!",
          description: data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        setIsValidated(false);
        toast({
          title: "Validation Failed",
          description: data.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to validation API",
        status: "error",
        duration: 3000,
      });
    } finally {
      setValidating(false);
    }
  };

  const handleProceed = () => {
    if (isValidated) {
      toast({
        title: "Welcome!",
        description: "Redirecting to dashboard...",
        status: "success",
        duration: 2000,
      });
      setTimeout(() => {
        // We use window.location to force a full reload and clear the layout cache
        window.location.href = "/";
      }, 1000);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const cardBg = useColorModeValue("white", "rgba(255, 255, 255, 0.05)");
  const borderColor = useColorModeValue("gray.200", "rgba(255, 255, 255, 0.1)");
  const mutedText = useColorModeValue("gray.600", "gray.400");

  const ConfigItem = ({ 
    label, 
    isConfigured, 
    description, 
    link, 
    linkText, 
    icon 
  }: { 
    label: string; 
    isConfigured: boolean; 
    description: string; 
    link?: string; 
    linkText?: string;
    icon: any;
  }) => (
    <Box
      p={6}
      borderRadius="2xl"
      bg={cardBg}
      border="1px solid"
      borderColor={isConfigured ? "green.400" : borderColor}
      transition="all 0.3s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "xl" }}
      position="relative"
      overflow="hidden"
    >
      <Box 
        position="absolute" 
        top="-10px" 
        right="-10px" 
        p={8} 
        bg={isConfigured ? "green.500" : "red.500"} 
        opacity={0.05} 
        borderRadius="full"
      />
      
      <VStack align="start" spacing={3}>
        <HStack justify="space-between" w="full">
          <HStack spacing={3}>
            <Icon as={icon} boxSize={5} color={isConfigured ? "green.400" : "red.400"} />
            <Heading size="sm" fontWeight="700">{label}</Heading>
          </HStack>
          <Badge 
            colorScheme={isConfigured ? "green" : "red"} 
            variant="subtle" 
            borderRadius="full" 
            px={3}
          >
            {isConfigured ? "Configured" : "Missing"}
          </Badge>
        </HStack>
        
        <Text fontSize="sm" color={mutedText}>
          {description}
        </Text>
        
        {link && !isConfigured && (
          <Link 
            href={link} 
            isExternal 
            fontSize="xs" 
            color="brand.400" 
            fontWeight="600"
            display="flex"
            alignItems="center"
          >
            {linkText || "Get it here"} <Icon as={FiExternalLink} ml={1} />
          </Link>
        )}
      </VStack>
    </Box>
  );

  if (loading) {
    return (
      <VStack h="100vh" justify="center" spacing={6}>
        <Spinner size="xl" thickness="4px" speed="0.65s" emptyColor="gray.200" color="brand.400" />
        <Text fontWeight="600" fontSize="lg">Checking configuration...</Text>
      </VStack>
    );
  }

  return (
    <Box 
      minH="100vh" 
      bg={useColorModeValue("gray.50", "#0a0e1a")} 
      py={20}
      px={4}
    >
      <Container maxW="4xl">
        <VStack spacing={12} align="stretch">
          <VStack spacing={4} textAlign="center">
            <Badge 
              colorScheme="purple" 
              variant="solid" 
              px={4} 
              py={1} 
              borderRadius="full"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="widest"
            >
              Setup Wizard
            </Badge>
            <Box 
              w="full" 
              maxW="400px" 
              h="200px" 
              borderRadius="3xl" 
              overflow="hidden" 
              boxShadow="2xl"
              mb={4}
              bg="rgba(255,255,255,0.05)"
            >
              <img 
                src="/setup-banner.png" 
                alt="Setup Banner" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Heading size="2xl" fontWeight="900" letterSpacing="-0.02em">
              Welcome to{" "}
              <Text as="span" bgGradient="linear(to-r, brand.400, accent.400)" bgClip="text">
                DScroll Names
              </Text>
            </Heading>
            <Text color={mutedText} fontSize="lg" maxW="600px">
              Let's get your environment ready. We've detected some missing configuration variables in your <Text as="span" fontWeight="bold" color="white">.env</Text> file.
            </Text>
          </VStack>

          {status && !status.isSingleChainConfigured && (
            <Box
              p={8}
              borderRadius="3xl"
              bg="rgba(239, 68, 68, 0.08)"
              border="1.5px solid"
              borderColor="red.500"
              boxShadow="0 8px 32px 0 rgba(239, 68, 68, 0.15)"
              backdropFilter="blur(10px)"
              w="full"
              position="relative"
              overflow="hidden"
            >
              <Box 
                position="absolute" 
                top="-20px" 
                right="-20px" 
                p={10} 
                bg="red.500" 
                opacity={0.08} 
                borderRadius="full"
              />
              <VStack align="start" spacing={5}>
                <HStack spacing={3}>
                  <Icon as={FiXCircle} boxSize={8} color="red.400" />
                  <Heading size="md" fontWeight="800" color="red.200" letterSpacing="-0.01em">
                    Multi-Chain Configuration Lockout
                  </Heading>
                </HStack>
                
                <Text fontSize="md" color="gray.300" lineHeight="tall">
                  This white-label application is designed to operate on <strong>exactly one blockchain</strong> at a time for all TLDs. Moving between chains within a single deployment is disabled by design.
                </Text>

                <Box w="full" p={4} borderRadius="2xl" bg="rgba(0, 0, 0, 0.3)" border="1px solid" borderColor="whiteAlpha.100">
                  <VStack align="start" spacing={3}>
                    <Text fontSize="sm" fontWeight="700" color="orange.300" textTransform="uppercase" letterSpacing="wider">
                      Current Configuration Error:
                    </Text>
                    <Text fontSize="sm" color="gray.300">
                      You have <strong>{CONFIG.blockchain.supportedChains.length} chains</strong> configured in your supported chains array:
                    </Text>
                    <Box py={1.5} px={3} bg="whiteAlpha.100" borderRadius="md" fontSize="xs" fontFamily="mono" color="red.300">
                      supportedChains: {JSON.stringify(CONFIG.blockchain.supportedChains)}
                    </Box>
                  </VStack>
                </Box>

                <Box w="full" p={5} borderRadius="2xl" bg="rgba(0, 0, 0, 0.4)" border="1px solid" borderColor="whiteAlpha.200">
                  <Heading size="xs" color="teal.300" mb={3} textTransform="uppercase" letterSpacing="wider">
                    How to Resolve:
                  </Heading>
                  <Text fontSize="sm" color="gray.300" mb={3}>
                    1. Open the file: <Text as="span" fontWeight="bold" color="white" textDecoration="underline">src/config/config.ts</Text><br />
                    2. Locate the <code>blockchain</code> property block.<br />
                    3. Modify <code>supportedChains</code> to contain <strong>only one chain</strong> (e.g., <code>["base"]</code>).
                  </Text>
                  <Box p={3} bg="gray.900" borderRadius="xl" fontFamily="mono" fontSize="xs" color="green.300" border="1px solid" borderColor="whiteAlpha.200">
                    {`blockchain: {
  defaultChain: "base",
  supportedChains: ["base"] as const,
}`}
                  </Box>
                </Box>
              </VStack>
            </Box>
          )}

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <ConfigItem 
              label="WalletConnect ID"
              isConfigured={status?.walletConnect || false}
              icon={FiGlobe}
              description="Required for connecting user wallets via WalletConnect."
              link="https://cloud.walletconnect.com/"
              linkText="Create project at WalletConnect Cloud"
            />
            <ConfigItem 
              label="Supabase URL"
              isConfigured={status?.supabaseUrl || false}
              icon={FiDatabase}
              description="Your Supabase project API URL for off-chain records."
              link="https://supabase.com/dashboard"
              linkText="Find in Supabase Settings -> API"
            />
            <ConfigItem 
              label="Supabase Anon Key"
              isConfigured={status?.supabaseAnonKey || false}
              icon={FiShield}
              description="Public API key for interacting with Supabase from the client."
            />
            <ConfigItem 
              label="Supabase Service Key"
              isConfigured={status?.supabaseServiceKey || false}
              icon={FiZap}
              description="Secret key for server-side operations and auto-setup."
            />
            <ConfigItem 
              label="Database URL"
              isConfigured={status?.databaseUrl || false}
              icon={FiAlertCircle}
              description="PostgreSQL connection string. If your password has special characters like @, #, or !, ensure they are URL-encoded or check our troubleshooting tip below."
              link="https://supabase.com/dashboard/project/_/settings/database"
              linkText="Copy Connection String (Transaction mode)"
            />
          </SimpleGrid>

          <Box 
            p={8} 
            borderRadius="3xl" 
            bgGradient="linear(to-br, brand.500, accent.600)" 
            color="white"
            boxShadow="0 20px 40px -12px rgba(26, 128, 255, 0.4)"
          >
            <VStack spacing={6}>
              <VStack align="start" w="full" spacing={2}>
                <Heading size="md">How to fix this?</Heading>
                <Text fontSize="sm" opacity={0.9}>
                  1. Rename <Text as="span" fontWeight="bold">.env.example</Text> to <Text as="span" fontWeight="bold">.env.local</Text> (or create a new one).<br/>
                  2. Fill in the missing values from your Supabase and WalletConnect dashboards.<br/>
                  3. Save the file and refresh this page.
                </Text>
                
                <Box mt={4} p={3} bg="whiteAlpha.200" borderRadius="xl" w="full">
                  <HStack spacing={2} mb={1}>
                    <Icon as={FiAlertCircle} color="orange.300" />
                    <Text fontSize="xs" fontWeight="bold" color="orange.300" textTransform="uppercase">Troubleshooting Connection</Text>
                  </HStack>
                  <Text fontSize="xs" opacity={0.8}>
                    • If validation fails with <Text as="span" fontFamily="mono">ETIMEDOUT</Text>, try using the <b>Connection Pooler</b> URL (port 6543) instead of direct (port 5432).<br/>
                    • If your password contains <b>special characters</b>, use <Text as="span" fontFamily="mono">encodeURIComponent('your_password')</Text> in JS console to get the encoded version for your URL.
                  </Text>
                </Box>
              </VStack>
              <Divider opacity={0.3} />
              <HStack w="full" justify="space-between">
                <HStack spacing={4}>
                  <Button 
                    leftIcon={<FiRefreshCw />} 
                    variant="outline" 
                    colorScheme="whiteAlpha"
                    size="lg"
                    fontWeight="800"
                    borderRadius="xl"
                    onClick={fetchStatus}
                    isLoading={loading}
                    _hover={{ transform: "scale(1.05)", bg: "whiteAlpha.100" }}
                  >
                    Refresh Env
                  </Button>
                  <Button 
                    leftIcon={<FiZap />} 
                    variant="solid" 
                    bg="white" 
                    color="brand.600"
                    size="lg"
                    fontWeight="800"
                    borderRadius="xl"
                    onClick={handleValidate}
                    isLoading={validating}
                    isDisabled={!status?.isAllConfigured}
                    _hover={{ transform: "scale(1.05)", boxShadow: "lg" }}
                  >
                    Validate Connectivity
                  </Button>
                </HStack>

                {isValidated && (
                  <Button 
                    rightIcon={<FiCheckCircle />} 
                    variant="solid" 
                    colorScheme="green"
                    size="lg"
                    fontWeight="900"
                    borderRadius="xl"
                    onClick={handleProceed}
                    _hover={{ transform: "scale(1.05)", boxShadow: "0 0 20px rgba(72, 187, 120, 0.6)" }}
                  >
                    Proceed to Dashboard
                  </Button>
                )}
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
