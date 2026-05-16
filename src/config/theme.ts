"use client";

import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  colors: {
    brand: {
      50: "#e6fffa",
      100: "#b2f5ea",
      200: "#81e6d9",
      300: "#4fd1c5",
      400: "#38b2ac",
      500: "#319795",
      600: "#2c7a7b",
      700: "#285e61",
      800: "#234e52",
      900: "#1d4044",
    },
    accent: {
      50: "#fffaf0",
      100: "#feebc8",
      200: "#fbd38d",
      300: "#f6ad55",
      400: "#ed8936",
      500: "#dd6b20",
      600: "#c05621",
      700: "#9c4221",
      800: "#7b341e",
      900: "#652b19",
    },
    glass: {
      light: "rgba(255, 255, 255, 0.08)",
      medium: "rgba(255, 255, 255, 0.12)",
      heavy: "rgba(255, 255, 255, 0.18)",
    },
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === "dark" ? "#0a0e1a" : "#f8f9fc",
        color: props.colorMode === "dark" ? "#e2e8f0" : "#1a202c",
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "xl",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      variants: {
        glass: (props: { colorMode: string }) => ({
          bg:
            props.colorMode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.04)",
          color: props.colorMode === "dark" ? "white" : "gray.800",
          border: "1px solid",
          borderColor:
            props.colorMode === "dark"
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.08)",
          backdropFilter: "blur(12px)",
          _hover: {
            bg:
              props.colorMode === "dark"
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.08)",
            transform: "translateY(-1px)",
            boxShadow: "lg",
          },
          _active: {
            transform: "translateY(0)",
          },
        }),
        gradient: {
          bgGradient: "linear(to-r, brand.400, accent.400)",
          color: "white",
          _hover: {
            bgGradient: "linear(to-r, brand.500, accent.500)",
            transform: "translateY(-2px)",
            boxShadow: "0 8px 30px rgba(26, 128, 255, 0.3)",
          },
          _active: {
            transform: "translateY(0)",
          },
        },
      },
    },
    Card: {
      baseStyle: (props: { colorMode: string }) => ({
        container: {
          bg:
            props.colorMode === "dark"
              ? "rgba(255,255,255,0.04)"
              : "white",
          border: "1px solid",
          borderColor:
            props.colorMode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "gray.100",
          borderRadius: "2xl",
          backdropFilter: "blur(12px)",
          transition: "all 0.3s ease",
          _hover: {
            borderColor:
              props.colorMode === "dark"
                ? "rgba(255,255,255,0.15)"
                : "gray.200",
            boxShadow: "lg",
          },
        },
      }),
    },
  },
});

export default theme;
