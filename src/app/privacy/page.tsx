"use client";

import React from "react";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Divider,
  UnorderedList,
  ListItem,
  useColorModeValue,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  HStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiEyeOff, FiChevronRight, FiCheckCircle, FiGlobe, FiDatabase, FiCloud } from "react-icons/fi";
import { CONFIG } from "@/config/config";
import Link from "next/link";

const MotionBox = motion.create(Box);

export default function PrivacyPage() {
  const brandBorder = useColorModeValue("brand.200", "brand.800");
  const glassBg = useColorModeValue("rgba(255, 255, 255, 0.4)", "rgba(10, 14, 26, 0.6)");
  const cardBorderColor = useColorModeValue("rgba(0, 0, 0, 0.08)", "rgba(255, 255, 255, 0.08)");
  const sectionBg = useColorModeValue("rgba(0, 0, 0, 0.02)", "rgba(255, 255, 255, 0.02)");
  const headingColor = useColorModeValue("gray.800", "white");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const mutedText = useColorModeValue("gray.500", "gray.500");
  const brandGlow = useColorModeValue("brand.500", "brand.300");

  return (
    <Box position="relative" minH="100vh" overflow="hidden" py={{ base: 12, md: 20 }}>
      {/* Dynamic Background Gradient Orbs */}
      <Box
        position="absolute"
        top="5%"
        left="-10%"
        w="600px"
        h="600px"
        bg="brand.500"
        filter="blur(220px)"
        opacity={0.06}
        borderRadius="full"
        pointerEvents="none"
        zIndex={0}
      />
      <Box
        position="absolute"
        bottom="10%"
        right="-15%"
        w="700px"
        h="700px"
        bg="accent.500"
        filter="blur(240px)"
        opacity={0.05}
        borderRadius="full"
        pointerEvents="none"
        zIndex={0}
      />

      <Container maxW="800px" position="relative" zIndex={1}>
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          spacing="8px"
          separator={<Icon as={FiChevronRight} color="gray.500" boxSize={3} />}
          fontSize="xs"
          fontWeight="semibold"
          color={mutedText}
          mb={6}
        >
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/" _hover={{ color: brandGlow }}>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <Text color={brandGlow}>Privacy Policy</Text>
          </BreadcrumbItem>
        </Breadcrumb>

        <MotionBox
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Main Card */}
          <Box
            p={{ base: 6, md: 12 }}
            borderRadius="3xl"
            bg={glassBg}
            backdropFilter="blur(16px)"
            border="1px solid"
            borderColor={brandBorder}
            boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.2)"
            transition="all 0.3s ease"
          >
            {/* Header section */}
            <VStack spacing={4} align="start" mb={8}>
              <HStack spacing={3}>
                <Box p={3} borderRadius="2xl" bg="rgba(26, 128, 255, 0.1)" color="brand.400">
                  <Icon as={FiEyeOff} boxSize={8} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" fontWeight="black" color="brand.400" textTransform="uppercase" letterSpacing="widest">
                    Privacy Statement
                  </Text>
                  <Heading as="h1" size="xl" color={headingColor} fontWeight="900" letterSpacing="-0.02em">
                    Privacy Policy
                  </Heading>
                </VStack>
              </HStack>

              <Text fontSize="xs" color={mutedText}>
                Last Updated: May 25, 2026 • Version 1.0 (Decentralized Release)
              </Text>
              
              <Divider borderColor={cardBorderColor} pt={2} />
            </VStack>

            {/* Privacy Promise Banner */}
            <Box
              p={5}
              borderRadius="2xl"
              bg="rgba(56, 178, 172, 0.05)"
              border="1px dashed"
              borderColor="teal.400"
              mb={8}
            >
              <HStack spacing={3} align="start">
                <Icon as={FiCheckCircle} color="teal.400" boxSize={5} mt={0.5} />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="700" fontSize="sm" color={headingColor}>
                    Our Decentralized Privacy Guarantee
                  </Text>
                  <Text fontSize="xs" color={textColor} lineHeight="1.6">
                    We believe in sovereign, self-custodial digital identities. {CONFIG.site_name} is engineered to completely avoid the tracking, logging, or database collection of your personal details. You interact directly with public blockchain nodes.
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Privacy Policy Content */}
            <VStack spacing={8} align="stretch" color={textColor} fontSize="sm" lineHeight="1.7">
              {/* Section 1 */}
              <VStack align="start" spacing={3}>
                <HStack spacing={2}>
                  <Icon as={FiDatabase} color="brand.400" boxSize={4} />
                  <Heading as="h2" size="sm" color={headingColor} fontWeight="800">
                    1. Zero Personal Data Collection (No PII)
                  </Heading>
                </HStack>
                <Text>
                  Unlike traditional platforms, we do **not** collect or store personal identifying information (PII).
                </Text>
                <UnorderedList spacing={2} pl={5}>
                  <ListItem>
                    **No Registrations**: You do not create a centralized account, input a password, or register an email address.
                  </ListItem>
                  <ListItem>
                    **No Databases**: We do not maintain traditional databases containing your IP addresses, location data, or browser history.
                  </ListItem>
                  <ListItem>
                    **No Payment Tracking**: Since all payments are handled on-chain via smart contracts using crypto assets, we have no access to credit card details, bank information, or personal financial records.
                  </ListItem>
                </UnorderedList>
              </VStack>

              {/* Section 2 */}
              <VStack align="start" spacing={3}>
                <HStack spacing={2}>
                  <Icon as={FiGlobe} color="brand.400" boxSize={4} />
                  <Heading as="h2" size="sm" color={headingColor} fontWeight="800">
                    2. Public Blockchain Data Visibility
                  </Heading>
                </HStack>
                <Text>
                  By using Web3 technologies, you understand that all transaction histories, wallet addresses, and sub-name registrations are written directly to public blockchains (such as the Base network).
                </Text>
                <Text>
                  This data is inherently public, transparent, immutable, and searchable by anyone on the network. This includes, but is not limited to, the links between your public wallet address, the sub-names you register, and the blockchain records (IPFS content hash, address resolution entries) associated with them.
                </Text>
                <Text>
                  Please exercise caution if you wish to maintain complete anonymity. An on-chain identity linked to a known public wallet can be traced back to other on-chain activities.
                </Text>
              </VStack>

              {/* Section 3 */}
              <VStack align="start" spacing={3}>
                <HStack spacing={2}>
                  <Icon as={FiCloud} color="brand.400" boxSize={4} />
                  <Heading as="h2" size="sm" color={headingColor} fontWeight="800">
                    3. Local Cache and Browser Storage
                  </Heading>
                </HStack>
                <Text>
                  To streamline your dashboard experience and avoid repeated network fetches, {CONFIG.site_name} may store harmless, anonymous local configuration state inside your browser's **Local Storage** or **cookies**.
                </Text>
                <Text>
                  This data includes items such as:
                </Text>
                <UnorderedList spacing={2} pl={5}>
                  <ListItem>
                    Your active wallet connection preferences.
                  </ListItem>
                  <ListItem>
                    Cached lists of registered sub-names for immediate dashboard loading.
                  </ListItem>
                  <ListItem>
                    Dark/light theme layout preferences.
                  </ListItem>
                </UnorderedList>
                <Text>
                  You can purge or restrict local storage caches at any time by clearing your browser's history or local cache options.
                </Text>
              </VStack>

              {/* Section 4 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  4. Third-Party Services & RPC Providers
                </Heading>
                <Text>
                  When your wallet issues a request (e.g., checks domain availability, queries a registry status), the client application connects to a public RPC (Remote Procedure Call) provider or indexer (like Supabase for verified synced data).
                </Text>
                <Text>
                  While we host a privacy-respecting client interface, interactions with third-party Web3 node networks, indexers, or decentralized wallet integrations are subject to the respective privacy policies of those individual services (e.g., your wallet extension's node network provider).
                </Text>
              </VStack>

              {/* Section 5 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  5. Compliance and Data Sovereignty
                </Heading>
                <Text>
                  Because we do not store, control, or log personal data in centralized systems, we are structurally incapable of deleting, porting, or modifying your data upon request. Your data sovereignty is managed directly by you via your wallet private keys and interactions with open-source, immutable public ledger protocols.
                </Text>
              </VStack>

              {/* Section 6 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  6. Policy Updates
                </Heading>
                <Text>
                  As the decentralized ecosystem evolves, we may update this privacy statement to reflect improvements in privacy preservation, client infrastructure modifications, or decentralized standard conventions. Continued interaction with the client interface constitutes acknowledgment of the prevailing privacy practices.
                </Text>
              </VStack>
            </VStack>
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
}
