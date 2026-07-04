import { anvil, sepolia } from "wagmi/chains";
import { getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";

export const config = getDefaultConfig({
    appName: "CulturePass",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [sepolia, anvil],
    ssr: false
});

export const culturePassTheme = lightTheme({
    accentColor: "#5B2BD9",
    accentColorForeground: "#FFFFFF",
    borderRadius: "medium",
});