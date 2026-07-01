// Scanner-side single-use record: signatures of QRs already accepted at this
// door, so the same pass can't be scanned twice. Stored in localStorage on the
// SCANNER device (frontend-only — a shared/cross-device guard would need a
// backend or an on-chain nonce). Each signature is unique per redemption.

const KEY = "culturepass:scanned";

type ScannedMap = Record<string, number>; // signature -> expiresAt (unix seconds)

function readAll(): ScannedMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as ScannedMap) : {};
    } catch {
        return {};
    }
}

function writeAll(map: ScannedMap) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function isScanned(signature: string): boolean {
    return signature in readAll();
}

// Marks a signature as used, and prunes entries whose validity has already passed
// so the store doesn't grow forever.
export function markScanned(signature: string, expiresAt: number, nowSec: number) {
    const map = readAll();
    for (const [sig, exp] of Object.entries(map)) {
        if (exp <= nowSec) delete map[sig];
    }
    map[signature] = expiresAt;
    writeAll(map);
}
