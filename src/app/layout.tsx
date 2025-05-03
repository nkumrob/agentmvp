import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/providers/trpc-provider";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agennt - AI Agent Platform for Personalized Knowledge",
  description:
    "Deploy personalized AI agents with consistent tone and up-to-date knowledge. Unify SFT, RAG, persona management, and analytics in one platform.",
  keywords:
    "AI agents, personalized AI, RAG, SFT, knowledge base, AI platform, chatbot, fine-tuning",
  authors: [{ name: "Agennt Team" }],
  openGraph: {
    title: "Agennt - AI Agent Platform for Personalized Knowledge",
    description:
      "Deploy personalized AI agents with consistent tone and up-to-date knowledge. Unify SFT, RAG, persona management, and analytics in one platform.",
    url: "https://agennt.ai",
    siteName: "Agennt",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agennt - AI Agent Platform for Personalized Knowledge",
    description:
      "Deploy personalized AI agents with consistent tone and up-to-date knowledge. Unify SFT, RAG, persona management, and analytics in one platform.",
    creator: "@agennt",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
