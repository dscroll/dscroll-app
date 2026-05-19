export const CONFIG = {
  logo: "/logo.png",
  site_name: "DScroll dApp",
  site_description: "Secure your digital identity with on-chain sub-names and cross-chain resolution",
  navigation: [
    { label: "Home", href: "/" },
    { label: "My Names", href: "/dashboard" },
    { label: "Airdrop", href: "/airdrop" },
  ],
  theme: "dark" as "light" | "dark",
  background: {
    light: "#f8f9fc",
    dark: "#0a0e1a",
  },
  footer: {
    text: "Powered by DScroll",
    socialLinks: {
      twitter: "https://x.com/dscrollHQ",
      github: "https://github.com/dscroll",
    },
  },
  blockchain: {
    defaultChain: "basesepolia",
    supportedChains: ["basesepolia"] as const,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
};

export type SupportedChain = (typeof CONFIG.blockchain.supportedChains)[number];
