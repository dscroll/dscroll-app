import ODudeSDK, { utils } from "@odude/odude-sdk";

export { utils };

// SDK Configuration
const config: any = {
  rpcUrl_sepolia: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
  rpcUrl_filecoin: process.env.NEXT_PUBLIC_FILECOIN_RPC_URL || "https://api.node.glif.io",
  rpcUrl_bnb: process.env.NEXT_PUBLIC_BNB_RPC_URL || "https://bsc-dataseed1.binance.org",
  rpcUrl_polygon: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com",
  rpcUrl_base: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  rpcUrl_mumbai: process.env.NEXT_PUBLIC_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
  rpcUrl: process.env.NEXT_PUBLIC_LOCALHOST_RPC_URL || "http://127.0.0.1:8545",
};

// Create SDK instance
export const sdk = new ODudeSDK(config);

// Initialize SDK
let initialized = false;
export const initializeSDK = (force = false) => {
  if (!initialized || force) {
    try {
      sdk.connectAllNetworks();
      initialized = true;
      console.log("✅ ODude SDK initialized");
    } catch (error) {
      console.error("❌ Failed to initialize ODude SDK:", error);
    }
  }
  return sdk;
};

// Function to reconnect to RPC providers and clear any signer-based runners
// This is useful after transactions to restore read capability
export const reconnectRPC = () => {
  try {
    // Reset internal SDK provider/signer state
    // We use some "any" casting to access internal properties if needed,
    // but the SDK's connectAllNetworks usually handles the basics.
    const sdkAny = sdk as any;
    
    // Clear any connected signers that might be breaking read calls
    if (sdkAny.signers) {
      sdkAny.signers = {};
    }
    
    // Force re-initialization of providers from config
    if (typeof sdkAny._initializeProviders === 'function') {
      sdkAny._initializeProviders();
    }
    
    sdk.connectAllNetworks();
    console.log("🔄 ODude SDK reconnected to RPC providers");
    return true;
  } catch (error) {
    console.error("❌ Failed to reconnect ODude SDK:", error);
    return false;
  }
};

// Reverse mapping from chain ID to ODude network
export const CHAIN_NETWORK_MAPPING: Record<number, string> = {
  314: "filecoin",
  56: "bsc",
  137: "polygon",
  8453: "base",
  84532: "basesepolia",
  80001: "mumbai",
};

// Helper function to get ODude network from chain ID
export const getODudeNetworkFromChainId = (chainId: number): string | null => {
  return CHAIN_NETWORK_MAPPING[chainId] || null;
};

export const handleSDKError = (error: any, context?: string): Error => {
  const contextMsg = context ? ` while ${context}` : "";
  console.error(`SDK Error${contextMsg}:`, error);

  // Ethers v6 error handling
  if (error?.code === "UNSUPPORTED_OPERATION") {
    return new Error("Network connection issue. Please refresh the page or check your wallet connection.");
  }

  if (error?.code === "NETWORK_ERROR") {
    return new Error("Network error. Please check your internet connection and try again.");
  }

  if (error?.message?.includes("user rejected") || error?.code === "ACTION_REJECTED") {
    return new Error("Transaction was rejected by the user.");
  }

  if (error?.message?.includes("insufficient funds")) {
    return new Error("Insufficient funds for this transaction.");
  }

  if (error?.message?.includes("contract runner does not support calling")) {
    return new Error("Provider synchronization issue. We're attempting to reconnect. Please try again in a moment.");
  }

  if (error?.message?.includes("TLD: Not found")) {
    return new Error("This TLD is not supported on the selected network.");
  }

  if (error instanceof Error) return error;
  return new Error(`An unexpected error occurred${contextMsg}.`);
};
