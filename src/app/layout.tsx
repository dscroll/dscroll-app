import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONFIG } from "@/config/config";
import { getSetupStatus, validateSupabaseConnection } from "@/utils/setup-check";
import SetupPage from "./setup/page";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://app.dscroll.com"),
  title: {
    default: `${CONFIG.site_name} | Decentralized Web3 Name & TLD Registry`,
    template: `%s | ${CONFIG.site_name}`,
  },
  description: CONFIG.site_description,
  keywords: [
    "DScroll",
    "Web3 Names",
    "Decentralized Identity",
    "TLD Registry",
    "Crypto Domains",
    "Base Network",
    "BSC Network",
    "Blockchain Domain",
    "Subnames",
    "Domain Name Service",
    "White-label Name Service",
    "Self-Custodial ID",
    "NFT Domains",
    "On-chain Identity",
    "Zero Renewal Domains",
    "Digital Identity Registry"
  ],
  authors: [{ name: "DScroll Team", url: "https://github.com/dscroll/dscroll-app" }],
  creator: "DScroll Team",
  publisher: "DScroll",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: `${CONFIG.site_name} | Decentralized Web3 Name & TLD Registry`,
    description: CONFIG.site_description,
    url: "/",
    siteName: CONFIG.site_name,
    images: [
      {
        url: "/homepage.png",
        width: 1200,
        height: 630,
        alt: "DScroll - Decentralized Web3 Name & TLD Registry and Custom Brand Identity Engine",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${CONFIG.site_name} | Decentralized Web3 Name & TLD Registry`,
    description: CONFIG.site_description,
    images: ["/homepage.png"],
    creator: "@dscrollHQ",
    site: "@dscrollHQ",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon1.png", type: "image/png", sizes: "192x192" },
      { url: "/icon0.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setup = await getSetupStatus();
  
  // If basic config is missing, it's definitely not configured
  let isConfigured = setup.isAllConfigured;
  
  // If basic config is present, perform a live connectivity check
  if (isConfigured) {
    const validation = await validateSupabaseConnection();
    isConfigured = validation.success;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {!isConfigured ? (
            <SetupPage />
          ) : (
            <>
              <Header />
              <main>{children}</main>
              <Footer />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
