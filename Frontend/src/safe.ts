// Minimal Safe{Wallet} Transaction Service client.
//
// On Sepolia the CulturePass proxy is owned by a 2-of-2 Safe, so admin calls are
// PROPOSED here as Safe transactions (an owner signs the EIP-712 SafeTx and we
// POST it to the transaction service). The owners then approve + execute in the
// Safe web app; `getSafeTxStatus` lets the UI poll until execution so Supabase
// is only updated once the call really landed on-chain.
//
// The EIP-712 hashing below was verified byte-for-byte against the Safe
// contract's own `getTransactionHash` on Sepolia.

import { hashTypedData, getAddress } from "viem";
import type { SafeConfig } from "./constants-ts.ts";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const SAFE_TX_TYPES = {
    SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: "baseGas", type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
    ],
} as const;

function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    // Optional: hosted service API key (set VITE_SAFE_API_KEY in .env if Safe
    // ever requires it for this endpoint).
    const key = import.meta.env.VITE_SAFE_API_KEY as string | undefined;
    if (key) h["Authorization"] = `Bearer ${key}`;
    return h;
}

export interface SafeInfo {
    nonce: number;
    threshold: number;
    owners: string[];
}

export async function getSafeInfo(cfg: SafeConfig): Promise<SafeInfo> {
    const res = await fetch(`${cfg.txServiceBase}/api/v1/safes/${cfg.address}/`, {
        headers: headers(),
    });
    if (!res.ok) throw new Error(`Safe service ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return { nonce: Number(j.nonce), threshold: Number(j.threshold), owners: j.owners };
}

// Next free nonce = max(on-chain nonce, highest queued proposal + 1), so several
// proposals can sit in the queue without colliding.
async function getNextNonce(cfg: SafeConfig, contractNonce: number): Promise<number> {
    const res = await fetch(
        `${cfg.txServiceBase}/api/v1/safes/${cfg.address}/multisig-transactions/?executed=false&limit=100`,
        { headers: headers() }
    );
    if (!res.ok) return contractNonce;
    const j = await res.json();
    const pendingNonces: number[] = (j.results ?? []).map((t: { nonce: number | string }) =>
        Number(t.nonce)
    );
    const highest = pendingNonces.length ? Math.max(...pendingNonces) + 1 : contractNonce;
    return Math.max(contractNonce, highest);
}

export interface ProposeResult {
    safeTxHash: `0x${string}`;
    nonce: number;
    threshold: number;
}

// Sign the SafeTx with the connected owner wallet and register the proposal with
// the transaction service (this is exactly what the Safe web app does).
export async function proposeSafeTransaction(params: {
    walletClient: { signTypedData: (a: unknown) => Promise<`0x${string}`> };
    account: `0x${string}`;
    chainId: number;
    cfg: SafeConfig;
    to: `0x${string}`;
    data: `0x${string}`;
}): Promise<ProposeResult> {
    const { walletClient, account, chainId, cfg, to, data } = params;

    const info = await getSafeInfo(cfg);
    const isOwner = info.owners.some((o) => o.toLowerCase() === account.toLowerCase());
    if (!isOwner) {
        throw new Error(
            `Connected wallet is not an owner of the admin Safe (${cfg.address}).`
        );
    }

    const nonce = await getNextNonce(cfg, info.nonce);

    const domain = { chainId, verifyingContract: getAddress(cfg.address) };
    const message = {
        to: getAddress(to),
        value: 0n,
        data,
        operation: 0,
        safeTxGas: 0n,
        baseGas: 0n,
        gasPrice: 0n,
        gasToken: ZERO,
        refundReceiver: ZERO,
        nonce: BigInt(nonce),
    };

    const safeTxHash = hashTypedData({
        domain,
        types: SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message,
    });

    const signature = await walletClient.signTypedData({
        account,
        domain,
        types: SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message,
    });

    const res = await fetch(
        `${cfg.txServiceBase}/api/v1/safes/${cfg.address}/multisig-transactions/`,
        {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
                safe: getAddress(cfg.address),
                to: getAddress(to),
                value: "0",
                data,
                operation: 0,
                gasToken: ZERO,
                safeTxGas: "0",
                baseGas: "0",
                gasPrice: "0",
                refundReceiver: ZERO,
                nonce,
                contractTransactionHash: safeTxHash,
                sender: getAddress(account),
                signature,
                origin: "CulturePass Admin",
            }),
        }
    );
    if (!res.ok && res.status !== 201) {
        throw new Error(`Safe proposal failed (${res.status}): ${await res.text()}`);
    }

    return { safeTxHash, nonce, threshold: info.threshold };
}

export interface SafeTxStatus {
    found: boolean;
    isExecuted: boolean;
    isSuccessful: boolean | null;
    transactionHash: `0x${string}` | null;
    confirmations: number;
    confirmationsRequired: number;
}

export async function getSafeTxStatus(
    cfg: SafeConfig,
    safeTxHash: string
): Promise<SafeTxStatus> {
    const res = await fetch(
        `${cfg.txServiceBase}/api/v1/multisig-transactions/${safeTxHash}/`,
        { headers: headers() }
    );
    if (res.status === 404) {
        return {
            found: false,
            isExecuted: false,
            isSuccessful: null,
            transactionHash: null,
            confirmations: 0,
            confirmationsRequired: 0,
        };
    }
    if (!res.ok) throw new Error(`Safe service ${res.status}`);
    const j = await res.json();
    return {
        found: true,
        isExecuted: Boolean(j.isExecuted),
        isSuccessful: j.isSuccessful ?? null,
        transactionHash: j.transactionHash ?? null,
        confirmations: (j.confirmations ?? []).length,
        confirmationsRequired: Number(j.confirmationsRequired ?? 0),
    };
}
