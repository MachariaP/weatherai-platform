import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeatherAI QA project",
  description: "QA Engineer take-home assignment — WeatherAI integration",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
