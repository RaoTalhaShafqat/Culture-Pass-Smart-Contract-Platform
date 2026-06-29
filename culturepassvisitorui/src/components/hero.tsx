
interface HeroProps {
    tier: string;
    tickets: string;
    days: string;
}

export function Hero({ tier, tickets, days }: HeroProps) {
    return (
        <section className="bg-black rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
            <div className="p-8 text-white">
                <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    Visitor Dashboard
                </div>
                <h1 className="text-5xl font-bold mb-6 tracking-tight">CulturePass</h1>
                <div className="flex gap-3 flex-wrap">
                    <StatBox label="Pass" value={tier} />
                    <StatBox label="Tickets" value={tickets} />
                    <StatBox label="Days" value={days} />
                </div>
            </div>

            <div className="bg-zinc-900 flex items-center justify-center p-8">
                <CulturePassMark />
            </div>
        </section>
    );
}

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 min-w-[80px]">
            <div className="text-xs text-zinc-400 mb-1">{label}</div>
            <div className="text-base font-bold text-white">{value}</div>
        </div>
    );
}

function CulturePassMark() {
    return (
        <svg viewBox="0 0 200 160" className="w-2/3 max-w-[180px]" aria-hidden="true">
            <defs>
                <linearGradient id="cpGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#B488FF" />
                    <stop offset="100%" stopColor="#5B2BD9" />
                </linearGradient>
            </defs>
            <polygon
                points="100,15 175,55 100,95 25,55"
                fill="none"
                stroke="#B488FF"
                strokeWidth="2"
                opacity="0.9"
            />
            <polygon points="100,55 175,95 100,135 25,95" fill="url(#cpGrad)" opacity="0.9" />
        </svg>
    );
}