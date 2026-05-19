import { http } from "wagmi";
import {
  base,
  bsc,
} from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { CONFIG } from "@/config/config";

// Map chain string identifiers to chain objects
export const chainMap = {
  base,
  bsc,
} as const;

// Supported chain objects array - dynamically mapped from CONFIG.blockchain.supportedChains
const supportedChainObjects = CONFIG.blockchain.supportedChains.map((c) => chainMap[c]);

// RainbowKit + Wagmi config
export const wagmiConfig = getDefaultConfig({
  appName: "DScroll Name",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: supportedChainObjects as any,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BNB_RPC_URL || undefined),
  },
  ssr: true,
});

// Helper: get supported chain IDs
export const supportedChainIds = supportedChainObjects.map((c) => c.id);

// Helper: check if a chain ID is supported
export function isChainSupported(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return (supportedChainIds as readonly number[]).includes(chainId);
}

// Helper: shorten address
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Helper: get chain name by ID
export function getChainName(chainId: number): string {
  const chain = supportedChainObjects.find((c) => c.id === chainId);
  return chain?.name || "Unknown Network";
}
