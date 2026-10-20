// Root layout for the Next.js app. Wraps every page with the HTML shell and
// global styles. No layout logic — just structure and metadata.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeWatch",
  description: "Authenticated home dashboard for nearby incidents and live alerts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-100 px-3 py-5 font-sans text-neutral-900 antialiased dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
        {children}
      </body>
    </html>
  );
}