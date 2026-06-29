const TIER_LABELS = ["None", "Explorer", "Enthusiast", "Patron"] as const;
const CATEGORY_LABELS = ["None", "Museum", "Theater", "Gallery", "Heritage"] as const;

export function tierLabel(tier: number): string {
    if (tier === 0) return "No active pass";
    return TIER_LABELS[tier] ?? "Unknown";
}

export function categoryLabel(category: number): string {
    return CATEGORY_LABELS[category] ?? "Unknown";
}

export function formatExpiry(expiry: bigint): string {
    if (expiry === 0n) return "No active pass";
    const ms = Number(expiry) * 1000;
    const date = new Date(ms);
    if (date.getTime() < Date.now()) return "Expired";
    return date.toLocaleDateString();
}

export function weiToEth(wei: bigint): string {
    // 1 ETH = 10^18 wei
    const eth = Number(wei) / 1e18;
    return eth.toString();
}

export function friendlyErrorMessage(error: { message: string } | null | undefined): string {
    if (!error) return "";

    const message = error.message;

    if (message.includes("CulturePass__passStillNOTExpired")) {
        return "You already have an active pass. Consider upgrading instead, or wait until it expires or you can renew the same pass.";
    }
    if (message.includes("CulturePass__insufficientFunds")) {
        return "Not enough ETH in your wallet to cover this purchase.";
    }
    if (message.includes("CulturePass__invalidTier")) {
        return "This tier isn't available right now.";
    }
    if (message.includes("CulturePass__exchangeRateNotSet")) {
        return "Pricing hasn't been configured yet. Please check back later.";
    }

    // Fallback for anything we haven't specifically mapped yet
    return "This purchase can't be completed right now.";
}