// Root layout for the Next.js app. Wraps every page with the HTML shell and
// global styles. No layout logic — just structure and metadata.
import type { Metadata } from "next";
import {JetBrains_Mono, Sora} from "next/font/google";
import "./globals.css";
import {BottomNav} from "@/components/bottom-nav";

const jetbrains = JetBrains_Mono({subsets: ["latin"], variable: "--font-jetbrains"});
const sora = Sora({subsets: ["latin"], variable: "--font-sora"});

export const metadata: Metadata = {
  title: "Starter Skeleton",
  description: "C12 Fall 2026 — every layer exists; the weeks make them deep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-bg ${jetbrains.variable} ${sora.variable}`}>
      <body className="mx-auto max-w-phone min-h-dvh px-4 pt-10 pb-24 font-sans text-fg antialiased bg-linear-to-b from-tint via-bg to-bg font-normal">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}