"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { config, culturePassTheme } from "@/lib/RainbowKitConfig";
import { useState } from "react";



export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={culturePassTheme}>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}