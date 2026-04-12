import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    // Proxy API calls to Express backend during development
    proxy: {
      "/admin": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/contact": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/special-offer-media": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries into separate chunks for better caching
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-charts":   ["recharts"],
          "vendor-ui":       ["lucide-react", "axios"],
        },
      },
    },
  },
});
