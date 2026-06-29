import Counter from "./Counter";
export default function About() {
    return (
        <main className="flex-1 p-8">
            <h1 className="text-2xl font-semibold">About CulturePass</h1>
            <p className="text-zinc-600 mt-2">
                A city-wide cultural access network powered by smart contracts.
            </p>
            <Counter />
        </main>
    );
}