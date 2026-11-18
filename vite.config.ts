// Builds the browser side only: src/client/main.ts (with its stylesheet) into dist/client, file names carrying a
// content hash, plus the files in public/. The Worker (src/worker/index.ts) is bundled by wrangler and reads
// dist/client/.vite/manifest.json to know those names.
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    manifest: true,
    target: "es2022",
    // hls.js (~580 KB) is its own file, loaded only when a station with an HLS stream starts playing.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: "src/client/main.ts",
    },
  },
});
