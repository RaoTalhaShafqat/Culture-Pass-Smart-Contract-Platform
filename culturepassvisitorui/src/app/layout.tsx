import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CulturePass",
  description: "City-wide cultural access network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-400 to-purple-700 text-white text-xs font-bold flex items-center justify-center">
                CP
              </span>
              <span className="font-semibold text-zinc-900">CulturePass</span>
            </div>
            <ConnectButton />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}