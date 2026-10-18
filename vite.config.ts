import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ir1101.github.io is a user site served from the domain root, so base stays "/".
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
  },
});
