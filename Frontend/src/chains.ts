import { defineChain, type Chain } from "viem";
import { sepolia } from "viem/chains";
import { chainsToCulturePass, type ChainDeployment } from "./constants-ts.ts";

export const anvil = defineChain({
    id: 31337,
    name: "Anvil",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

// viem chain object for the connected chain (used for tx params/wallet prompts).
export function resolveChain(chainId: number): Chain {
    if (chainId === 31337) return anvil;
    if (chainId === sepolia.id) return sepolia;
    // Unknown chain: still return something usable for reads, deployment lookup
    // below is what actually gates functionality.
    return defineChain({
        id: chainId,
        name: `Chain ${chainId}`,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [] } },
    });
}

// CulturePass deployment for the connected chain, or null if unsupported.
export function getDeployment(chainId: number): ChainDeployment | null {
    return chainsToCulturePass[chainId] ?? null;
}
