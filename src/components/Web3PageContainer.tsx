"use client";

import React from "react";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { FiWifi } from "react-icons/fi";
import { isChainSupported, getChainName, supportedChainIds } from "@/utils/web3";
import config from "@/config/config.json";


const MotionBox = motion.create(Box);

interface Web3PageContainerProps {
  children: React.ReactNode;
  maxW?: string;
}

export default function Web3PageContainer({
  children,
  maxW = "1200px",
}: Web3PageContainerProps) {
  const { isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const brandBorder = useColorModeValue("brand.200", "brand.800");
  const cardBg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const mutedText = useColorModeValue("gray.500", "gray.500");

  const currentChainId = chain?.id || chainId;
  const unsupportedNetwork = isConnected && !isChainSupported(currentChainId);

  return (
    <Box position="relative">
      {/* Gradient Orbs Background */}
      <Box
        position="absolute"
        top="100px"
        right="-200px"
        w="500px"
        h="500px"
        bg="brand.400"
        filter="blur(180px)"
        opacity={0.08}
        borderRadius="full"
        pointerEvents="none"
        zIndex={0}
      />

      <Container maxW={maxW} pt={{ base: 4, md: 6 }} pb={8}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box position="relative">
            {/* Primary Content Box with Border */}
            <Box
              p={{ base: 4, md: 6 }}
              borderRadius="3xl"
              bg="transparent"
              backdropFilter={unsupportedNetwork ? "blur(8px)" : "blur(10px)"}
              border="1px solid"
              borderColor={brandBorder}
              opacity={unsupportedNetwork ? 0.3 : 1}
              pointerEvents={unsupportedNetwork ? "none" : "auto"}
              transition="all 0.3s ease"
            >
              {children}
            </Box>

            {/* Wrong Network Overlay */}
            {unsupportedNetwork && (
              <Box
                position="absolute"
                inset={0}
                zIndex={10}
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="transparent"
                borderRadius="3xl"
              >
                <VStack
                  bg={cardBg}
                  p={8}
                  borderRadius="2xl"
                  boxShadow="2xl"
                  spacing={4}
                  border="1px solid"
                  borderColor="red.300"
                  backdropFilter="blur(10px)"
                >
                  <Icon as={FiWifi} boxSize={10} color="red.400" />
                  <Heading size="md">{config.common_ui.wrong_network.title}: {chain?.name || "Unknown"}</Heading>

                  <Text fontSize="sm" color={mutedText} textAlign="center">
                    {config.common_ui.wrong_network.description}
                  </Text>

                  <Button
                    colorScheme="red"
                    size="md"
                    borderRadius="xl"
                    onClick={() => switchChain({ chainId: supportedChainIds[0] })}
                    _hover={{ transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(255, 0, 0, 0.2)" }}
                  >
                    {config.common_ui.wrong_network.switch_button} {getChainName(supportedChainIds[0])}
                  </Button>

                </VStack>
              </Box>
            )}
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
}
