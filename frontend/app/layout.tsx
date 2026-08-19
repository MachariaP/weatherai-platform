import type { Metadata } from "next";
import "./globals.css";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { Header } from "@/components/ui/Header";

export const metadata: Metadata = {
  title: "WeatherAI Dashboard",
  description: "QA Engineer take-home assignment — WeatherAI integration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LocationProvider>
          <PreferencesProvider>
            <Header />
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          </PreferencesProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
