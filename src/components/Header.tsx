"use client";

import React from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  Text,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VStack,
  Collapse,
  Badge,
  Tooltip,
  Image,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain, useBalance } from "wagmi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONFIG } from "@/config/config";
import { isChainSupported, getChainName, supportedChainIds } from "@/utils/web3";
import { FiPower } from "react-icons/fi";

export default function Header() {
  const { isOpen, onToggle } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({ address });
  const pathname = usePathname();

  // Theme colors - moved to top
  const bgColor = useColorModeValue("rgba(255,255,255,0.8)", "rgba(10,14,26,0.85)");
  const borderColor = useColorModeValue("rgba(0,0,0,0.06)", "rgba(255,255,255,0.08)");
  const navActiveColor = useColorModeValue("brand.600", "brand.300");
  const navInactiveColor = useColorModeValue("gray.600", "gray.400");
  const navActiveBg = useColorModeValue("brand.50", "rgba(26,128,255,0.1)");
  const navHoverBg = useColorModeValue("gray.100", "rgba(255,255,255,0.06)");
  const modeIconColor = useColorModeValue("gray.600", "gray.400");
  const modeHoverIconColor = useColorModeValue("orange.500", "yellow.300");
  const mobileMenuBg = useColorModeValue("white", "gray.900");
  
  // Status bar colors
  const barBgNormal = useColorModeValue("rgba(26,128,255,0.05)", "rgba(26,128,255,0.1)");
  const barBgError = useColorModeValue("red.50", "rgba(255, 0, 0, 0.05)");
  const barTextMuted = useColorModeValue("gray.600", "gray.400");
  const barTextNormal = useColorModeValue("gray.800", "gray.200");

  // Network detection
  const currentChainId = chain?.id || chainId;
  const unsupportedNetwork = isConnected && !isChainSupported(currentChainId);

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={1000}
      bg={bgColor}
      backdropFilter="blur(20px)"
      borderBottom="1px solid"
      borderColor={borderColor}
      transition="all 0.3s ease"
    >
      <Flex
        maxW="1400px"
        mx="auto"
        px={{ base: 4, md: 8 }}
        py={3}
        align="center"
        justify="space-between"
      >
        {/* Logo & Site Name */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <HStack spacing={3} cursor="pointer" _hover={{ opacity: 0.85 }}>
            <Image
              src={CONFIG.logo}
              alt={CONFIG.site_name}
              w="36px"
              h="36px"
              objectFit="contain"
              fallback={
                <Box
                  w="36px"
                  h="36px"
                  borderRadius="xl"
                  bgGradient="linear(to-br, brand.400, accent.400)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontWeight="bold"
                  fontSize="lg"
                  color="white"
                >
                  D
                </Box>
              }
            />
            <Text
              fontSize="xl"
              fontWeight="800"
              bgGradient="linear(to-r, brand.400, accent.400)"
              bgClip="text"
              letterSpacing="-0.02em"
            >
              {CONFIG.site_name}
            </Text>
          </HStack>
        </Link>

        {/* Desktop Navigation */}
        <HStack spacing={1} display={{ base: "none", md: "flex" }}>
          {CONFIG.navigation.map((item) => (
            <Link key={item.label} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                fontWeight={pathname === item.href ? "700" : "500"}
                color={pathname === item.href ? navActiveColor : navInactiveColor}
                bg={pathname === item.href ? navActiveBg : "transparent"}
                borderRadius="lg"
                _hover={{
                  bg: navHoverBg,
                  color: navActiveColor,
                }}
                transition="all 0.2s ease"
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </HStack>

        {/* Right Section */}
        <HStack spacing={3}>
          {/* Dark/Light Mode Toggle */}
          <Tooltip
            label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
            hasArrow
          >
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
              borderRadius="lg"
              color={modeIconColor}
              _hover={{
                bg: navHoverBg,
                color: modeHoverIconColor,
              }}
              transition="all 0.2s ease"
            />
          </Tooltip>

          {/* Wallet Connect */}
          <Box display={{ base: "none", md: "block" }}>
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </Box>

          {/* Mobile Menu Toggle */}
          <IconButton
            aria-label="Toggle menu"
            icon={isOpen ? <CloseIcon boxSize={3} /> : <HamburgerIcon />}
            onClick={onToggle}
            display={{ base: "flex", md: "none" }}
            variant="ghost"
            size="sm"
            borderRadius="lg"
          />
        </HStack>
      </Flex>

      {/* Dashboard Network Bar - Consolidated Status & Network Info */}
      {isConnected && (
        <Box
          bg={unsupportedNetwork ? barBgError : barBgNormal}
          borderTop="1px solid"
          borderBottom="1px solid"
          borderColor={unsupportedNetwork ? "red.200" : borderColor}
          px={4}
          py={1.5}
          transition="all 0.3s ease"
        >
          <HStack justify="center" spacing={6} fontSize="xs" fontWeight="600" flexWrap="wrap">
            <HStack spacing={1.5}>
              <Box 
                w={1.5} 
                h={1.5} 
                borderRadius="full" 
                bg={unsupportedNetwork ? "red.500" : "green.400"} 
                boxShadow={unsupportedNetwork ? "0 0 8px red" : "none"}
              />
              <Text color={barTextMuted}>Status:</Text>
              <Text color={unsupportedNetwork ? "red.500" : "green.500"}>
                {unsupportedNetwork ? "Wrong Network" : "Connected"}
              </Text>
            </HStack>
            
            <HStack spacing={1.5}>
              <Text color={barTextMuted}>Network:</Text>
              <Text color={unsupportedNetwork ? "red.400" : "brand.400"}>
                {chain?.name || getChainName(currentChainId)}
              </Text>
            </HStack>
            
            <HStack spacing={1.5}>
              <Text color={barTextMuted}>Chain ID:</Text>
              <Text color={unsupportedNetwork ? "red.400" : "accent.400"}>{currentChainId}</Text>
            </HStack>

            <HStack spacing={1.5}>
              <Text color={barTextMuted}>Balance:</Text>
              <Text color={barTextNormal}>
                {balanceData 
                  ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
                  : "Loading..."}
              </Text>
            </HStack>

            {unsupportedNetwork && (
              <Button
                size="xs"
                height="22px"
                px={3}
                fontSize="10px"
                colorScheme="red"
                borderRadius="full"
                onClick={() => switchChain({ chainId: supportedChainIds[0] })}
                _hover={{ transform: "scale(1.05)" }}
              >
                Switch to {getChainName(supportedChainIds[0])}
              </Button>
            )}
          </HStack>
        </Box>
      )}

      {/* Mobile Menu */}
      <Collapse in={isOpen} animateOpacity>
        <VStack
          display={{ md: "none" }}
          px={4}
          py={4}
          spacing={3}
          bg={mobileMenuBg}
          borderTop="1px solid"
          borderColor={borderColor}
        >
          {CONFIG.navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={{ width: "100%" }}
            >
              <Button
                variant="ghost"
                w="full"
                justifyContent="flex-start"
                fontWeight={pathname === item.href ? "700" : "500"}
                color={pathname === item.href ? navActiveColor : undefined}
                bg={pathname === item.href ? navActiveBg : "transparent"}
                borderRadius="lg"
                onClick={onToggle}
              >
                {item.label}
              </Button>
            </Link>
          ))}
          <Box w="full" pt={2}>
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="full"
            />
          </Box>
        </VStack>
      </Collapse>
    </Box>
  );
}
