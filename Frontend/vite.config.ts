import { defineConfig } from "vite";
import { resolve } from "node:path";

// This app has no index.html — its two real pages are the build entries.
export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                admin: resolve(import.meta.dirname, "admin.html"),
                venue: resolve(import.meta.dirname, "venue.html"),
            },
        },
    },
});
