"use client";

import React from "react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/utils/web3";
import theme from "@/config/theme";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={{
              darkMode: darkTheme({
                accentColor: "#38b2ac",
                accentColorForeground: "white",
                borderRadius: "large",
                overlayBlur: "small",
              }),
              lightMode: lightTheme({
                accentColor: "#319795",
                accentColorForeground: "white",
                borderRadius: "large",
                overlayBlur: "small",
              }),
            }}
          >
            <ChakraProvider theme={theme}>{children}</ChakraProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}
