import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // ⚠️ Remplace "satisfaction-app" par le nom exact de ton repo GitHub
  base: "/satisfaction-app/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
