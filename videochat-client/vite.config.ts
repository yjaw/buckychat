import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("/react") || id.includes("react-router-dom")) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) {
            return "supabase";
          }
          if (id.includes("posthog-js")) {
            return "analytics";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          return "vendor";
        }
      }
    }
  }
});
