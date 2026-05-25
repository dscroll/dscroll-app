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
import { FiShield, FiChevronRight, FiAlertTriangle, FiCpu, FiKey } from "react-icons/fi";
import { CONFIG } from "@/config/config";
import Link from "next/link";

const MotionBox = motion.create(Box);

export default function TermsPage() {
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
            <Text color={brandGlow}>Terms & Conditions</Text>
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
                  <Icon as={FiShield} boxSize={8} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" fontWeight="black" color="brand.400" textTransform="uppercase" letterSpacing="widest">
                    Legal Framework
                  </Text>
                  <Heading as="h1" size="xl" color={headingColor} fontWeight="900" letterSpacing="-0.02em">
                    Terms & Conditions
                  </Heading>
                </VStack>
              </HStack>

              <Text fontSize="xs" color={mutedText}>
                Last Updated: May 25, 2026 • Version 1.0 (Decentralized Release)
              </Text>
              
              <Divider borderColor={cardBorderColor} pt={2} />
            </VStack>

            {/* Introduction Note Box */}
            <Box
              p={5}
              borderRadius="2xl"
              bg="rgba(26, 128, 255, 0.05)"
              border="1px dashed"
              borderColor="brand.400"
              mb={8}
            >
              <HStack spacing={3} align="start">
                <Icon as={FiAlertTriangle} color="brand.400" boxSize={5} mt={0.5} />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="700" fontSize="sm" color={headingColor}>
                    Attention Web3 User
                  </Text>
                  <Text fontSize="xs" color={textColor} lineHeight="1.6">
                    By accessing or using the {CONFIG.site_name} platform, you acknowledge that you are interacting with public smart contracts deployed on the blockchain. You agree to be legally bound by these terms. Please read them carefully.
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Terms Body Text */}
            <VStack spacing={8} align="stretch" color={textColor} fontSize="sm" lineHeight="1.7">
              {/* Section 1 */}
              <VStack align="start" spacing={3}>
                <HStack spacing={2}>
                  <Icon as={FiCpu} color="brand.400" boxSize={4} />
                  <Heading as="h2" size="sm" color={headingColor} fontWeight="800">
                    1. Decentralized Infrastructure & Smart Contracts
                  </Heading>
                </HStack>
                <Text>
                  {CONFIG.site_name} is a decentralized client interface that facilitates interactions with decentralized top-level domains (TLDs) and sub-name registration registries. The platform provides a portal where users can register, resolve, and configure sub-names on the public blockchain (Base Network and other supported chains).
                </Text>
                <Text>
                  By using this interface, you understand and acknowledge that all write actions (including minting, configuring records, or transferring ownership) are executed directly via autonomous smart contracts on the blockchain. These contracts are open-source, immutable, and run independently of any centralized entity.
                </Text>
              </VStack>

              {/* Section 2 */}
              <VStack align="start" spacing={3}>
                <HStack spacing={2}>
                  <Icon as={FiKey} color="brand.400" boxSize={4} />
                  <Heading as="h2" size="sm" color={headingColor} fontWeight="800">
                    2. Cryptographic Self-Custody & Responsibility
                  </Heading>
                </HStack>
                <Text>
                  To interact with {CONFIG.site_name}, you must connect a Web3 wallet (e.g., MetaMask, Coinbase Wallet). We do not control, manage, or hold custody of your digital assets, private keys, or wallet credentials.
                </Text>
                <UnorderedList spacing={2} pl={5}>
                  <ListItem>
                    You are solely responsible for maintaining the security of your cryptographic private keys and seed phrases.
                  </ListItem>
                  <ListItem>
                    If you lose access to your private key, you will permanently lose control over any names or assets minted through {CONFIG.site_name}.
                  </ListItem>
                  <ListItem>
                    We cannot retrieve or recover keys, passwords, or assets under any circumstances.
                  </ListItem>
                </UnorderedList>
              </VStack>

              {/* Section 3 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  3. On-Chain Registry Rules & Gas Fees
                </Heading>
                <Text>
                  Every register, transfer, or modification of a sub-name requires an on-chain transaction that must be confirmed by the relevant validator network. These operations incur a gas fee paid in the native currency of the respective blockchain (e.g., ETH on Base).
                </Text>
                <Text>
                  All completed registrations are irreversible. Since registration metadata is stored permanently on-chain, we cannot edit, delete, or reverse any names registered to your wallet address. Registrations of sub-names are final and persistent under the smart contract parameters.
                </Text>
              </VStack>

              {/* Section 4 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  4. Warranty Disclaimer & "As Is" Release
                </Heading>
                <Text>
                  THE INTERFACE AND ALL SMART CONTRACTS INTEGRATIONS ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, {CONFIG.site_name.toUpperCase()} DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
                </Text>
                <Text>
                  You accept all inherent risks of utilizing blockchain technologies, including but not limited to smart contract exploits, network congestion, sudden protocol upgrades, and regulatory changes in your jurisdiction.
                </Text>
              </VStack>

              {/* Section 5 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  5. Acceptable Use Policy
                </Heading>
                <Text>
                  When registering sub-names or utilizing this interface, you agree not to:
                </Text>
                <UnorderedList spacing={2} pl={5}>
                  <ListItem>
                    Use the service for any illegal activities or to evade international sanctions.
                  </ListItem>
                  <ListItem>
                    Deploy malicious code, interface hacks, or execute direct smart contract exploits targeting {CONFIG.site_name} assets or other users.
                  </ListItem>
                  <ListItem>
                    Impersonate official brands, trademarked entities, or register malicious domains with the explicit intent of phishing or fraud.
                  </ListItem>
                </UnorderedList>
              </VStack>

              {/* Section 6 */}
              <VStack align="start" spacing={3}>
                <Heading as="h3" size="xs" color={headingColor} fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
                  6. Amendments to the Web Interface
                </Heading>
                <Text>
                  While the underlying smart contracts are deployed immutably to the blockchain, the web interface (app portal) hosting this client may be amended, redeployed, or suspended at any time to improve compatibility, security, or utility. Continued use of the website following upgrades constitutes your acceptance of the updated client interface.
                </Text>
              </VStack>
            </VStack>
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
}
