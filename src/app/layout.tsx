import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-body" });

export const metadata: Metadata = { title: "Liftlog", description: "Track every set, every day." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${display.variable} ${body.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
