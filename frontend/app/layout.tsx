import type { Metadata } from "next";
import "./globals.css";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { Header } from "@/components/ui/Header";

export const metadata: Metadata = {
  title: "WeatherAI Dashboard",
  description:
    "Current conditions, a 7-day forecast, and an hourly outlook for any location on Earth.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg"
        >
          Skip to content
        </a>
        <LocationProvider>
          <PreferencesProvider>
            <Header />
            <main
              id="main"
              tabIndex={-1}
              className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 focus:outline-none"
            >
              {children}
            </main>
          </PreferencesProvider>
        </LocationProvider>
      </body>
    </html>
  );
}