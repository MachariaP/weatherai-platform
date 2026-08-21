import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { ViewProvider } from "@/components/providers/ViewProvider";
import { Header } from "@/components/ui/Header";
import { BottomNav } from "@/components/ui/BottomNav";
import { SiteFooter } from "@/components/ui/SiteFooter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeatherAI",
  description: "Look up weather by place name or coordinates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
        >
          Skip to content
        </a>
        <LocationProvider>
          <PreferencesProvider>
            <ViewProvider>
              <Header />
              <main
                id="main"
                tabIndex={-1}
                className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:pb-10 focus:outline-none relative z-10"
              >
                {children}
              </main>
              <SiteFooter />
              <BottomNav />
            </ViewProvider>
          </PreferencesProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
