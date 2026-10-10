import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Mentio — Learn from vetted mentors",
    template: "%s · Mentio",
  },
  description:
    "Book 1:1 mentorship calls with vetted mentors. Mentio is in early access.",
  keywords: ["mentorship", "career", "interview prep", "open source"],
  openGraph: {
    title: "Mentio",
    description: "Learn from vetted mentors. Early access.",
    type: "website",
    siteName: "Mentio",
  },
  twitter: { card: "summary", title: "Mentio", description: "Book 1:1 mentorship calls with people you aspire to become." },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <nav aria-label="Skip links">
          <a href="#main-content" className="sr-only z-[100] rounded-md bg-background px-4 py-2 text-sm font-medium shadow-soft focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        </nav>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
