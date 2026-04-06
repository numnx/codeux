import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "dashboard",
  cacheDir: "../.cache/vite/dashboard",
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      "react": "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('preact') || id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('three')) {
              return 'three';
            }
          }
        },
      },
    },
  },
});
