import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Orbitron } from "next/font/google";
import { Providers } from "./providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { FaGithub } from "react-icons/fa";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "CULTRA CHAIN",
  description: "Decentralized cultural access network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="bg-gray-50 border-b border-zinc-200 px-6 h-15 flex items-center justify-between relative">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
              <div className="h-35 w-35 relative flex-shrink-0 -ml-14">
                <Image
                  src="./logo.png"
                  alt="CULTRA CHAIN logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Center: Fancy title + subtitle */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 whitespace-nowrap leading-tight">
              <span
                className={`${orbitron.className} text-2xl font-black uppercase tracking-widest animate-gradient`}
                style={{
                  background: "linear-gradient(135deg, #077ff7, #077ff7, #5c0feb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 0 30px rgba(92, 15, 235, 0.2)",
                }}
              >
                CULTRACHAIN
              </span>

              {/* Fancy diamond separator */}
              <span className="text-indigo-300 text-xl font-light">◆</span>

              <span className="text-xs text-indigo-500 font-light tracking-[0.2em] uppercase">
                Decentralized Cultural Access
              </span>
            </div>

            {/* Right: GitHub + Connect */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/RaoTalhaShafqat/Culture-Pass-Smart-Contract-Platform"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-zinc-900 transition-colors"
                aria-label="GitHub repository"
              >
                <FaGithub size={30} />
              </a>
              <ConnectButton />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}