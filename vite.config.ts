import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    "process.env.TURSO_AUTH_TOKEN": JSON.stringify(
      process.env.TURSO_AUTH_TOKEN,
    ),
  },
  server: {
    host: "0.0.0.0",
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: [
      "@tursodatabase/database-wasm32-wasi",
      "@tursodatabase/sync-wasm32-wasi",
    ],
  },
});
