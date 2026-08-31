import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this project under /data8tablefuncsvisualizer/
  base: process.env.GITHUB_PAGES === "true" ? "/data8tablefuncsvisualizer/" : "/",
  plugins: [react()],
});
