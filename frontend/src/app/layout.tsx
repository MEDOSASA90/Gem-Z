import type { Metadata } from "next";
import { Inter, Outfit, Tajawal } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../context/LanguageContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SocketProvider } from "../context/SocketContext";
import FloatingSupportWidget from "../components/FloatingSupportWidget";
import SideNav from "../components/SideNav";
import TopNav from "../components/TopNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-outfit" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"], variable: "--font-tajawal" });

export const metadata: Metadata = {
  title: "GEM Z | The Ultimate Fitness Ecosystem",
  description: "The B2B/B2C platform connecting Trainees, Trainers, Gyms, and Stores — powered by AI.",
  icons: { icon: "/gem-z-logo.png" },
  appleWebApp: { title: "GEM Z", statusBarStyle: "black-translucent" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${tajawal.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) { console.log('SW Registration successful:', registration.scope); },
                    function(err) { console.log('SW Registration failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen transition-colors duration-300">
        <ThemeProvider>
          <LanguageProvider>
            <SocketProvider>
              <TopNav />
              <main className="max-w-[1440px] mx-auto min-h-screen flex flex-col relative w-full overflow-x-hidden">
                {children}
              </main>
              <SideNav />
              <FloatingSupportWidget />
            </SocketProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
