import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CONFIG } from "@/config/config";
import { getSetupStatus, validateSupabaseConnection } from "@/utils/setup-check";
import SetupPage from "./setup/page";
import Providers from "./providers";

export const metadata: Metadata = {
  title: CONFIG.site_name,
  description: CONFIG.site_description,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: CONFIG.site_name,
    description: CONFIG.site_description,
    type: "website",
    siteName: CONFIG.site_name,
  },
  twitter: {
    card: "summary_large_image",
    title: CONFIG.site_name,
    description: CONFIG.site_description,
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
