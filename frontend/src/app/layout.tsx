import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "../core/providers/query-provider";

export const metadata: Metadata = {
  title: "GEM Z — Unified Global Cyber-Fitness Ecosystem",
  description: "Experience the next generation of unified fitness tracking: SaaS multi-branch gym networks, real-time computer vision joint tracking, high-yield Move-to-Earn tokenomics, B2B corporate wellness analytics, and secure marketplace escrows.",
  metadataBase: new URL("https://gemz.fit"),
  openGraph: {
    title: "GEM Z — Unified Global Cyber-Fitness Ecosystem",
    description: "The premier global platform bridging SaaS gym governance, biometric AI coaching, and decentralized financial compliance.",
    type: "website",
    locale: "ar_EG",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0F"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col transition-colors duration-300">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
