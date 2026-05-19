"use client";

import React from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Link as ChakraLink,
  useColorModeValue,
  Icon,
  Divider,
  VStack,
  Image,
} from "@chakra-ui/react";
import { FaTwitter, FaGithub, FaHeart } from "react-icons/fa";
import { CONFIG } from "@/config/config";

export default function Footer() {
  const bgColor = useColorModeValue(
    "rgba(255,255,255,0.6)",
    "rgba(10,14,26,0.8)"
  );
  const borderColor = useColorModeValue(
    "rgba(0,0,0,0.06)",
    "rgba(255,255,255,0.06)"
  );
  const mutedColor = useColorModeValue("gray.500", "gray.500");
  const iconHover = useColorModeValue("brand.500", "brand.300");

  return (
    <Box
      as="footer"
      bg={bgColor}
      backdropFilter="blur(12px)"
      borderTop="1px solid"
      borderColor={borderColor}
      mt="auto"
    >
      <Flex
        maxW="1400px"
        mx="auto"
        px={{ base: 4, md: 8 }}
        py={6}
        direction={{ base: "column", md: "row" }}
        align="center"
        justify="space-between"
        gap={4}
      >
        {/* Left: Logo & Powered by */}
        <VStack spacing={2} align={{ base: "center", md: "flex-start" }}>
          <HStack spacing={2}>
            <Image
              src={CONFIG.logo}
              alt={CONFIG.site_name}
              w="24px"
              h="24px"
              objectFit="contain"
            />
            <Text fontSize="sm" fontWeight="700" color={iconHover}>
              {CONFIG.site_name}
            </Text>
          </HStack>
          <VStack spacing={0} align={{ base: "center", md: "flex-start" }}>
            <HStack spacing={1}>
              <Text fontSize="sm" color={mutedColor}>
                {CONFIG.footer.text}
              </Text>
              <Icon as={FaHeart} color="red.400" boxSize={3} />
            </HStack>
          </VStack>
        </VStack>

        {/* Center: Blockchain Info */}
        <Text fontSize="xs" color={mutedColor} opacity={0.5}>
          Supporting {CONFIG.blockchain.supportedChains.length} {CONFIG.blockchain.supportedChains.length === 1 ? "network" : "networks"} •
          Default: {CONFIG.blockchain.defaultChain}
        </Text>

        {/* Right: Social Links */}
        <HStack spacing={4}>
          <ChakraLink
            href={CONFIG.footer.socialLinks.twitter}
            isExternal
            _hover={{ color: iconHover, transform: "translateY(-2px)" }}
            transition="all 0.2s ease"
            color={mutedColor}
          >
            <Icon as={FaTwitter} boxSize={5} />
          </ChakraLink>
          <ChakraLink
            href={CONFIG.footer.socialLinks.github}
            isExternal
            _hover={{ color: iconHover, transform: "translateY(-2px)" }}
            transition="all 0.2s ease"
            color={mutedColor}
          >
            <Icon as={FaGithub} boxSize={5} />
          </ChakraLink>
        </HStack>
      </Flex>
    </Box>
  );
}
