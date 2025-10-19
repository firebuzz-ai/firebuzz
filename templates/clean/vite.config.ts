import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";
import terminal from "vite-plugin-terminal";
import { firebuzzDesignMode } from "./src/design-mode/vite-plugin-design-mode";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    firebuzzDesignMode(),
    ...(process.env.NODE_ENV !== "production"
      ? [
          terminal({
            console: "terminal",
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  server: {
    allowedHosts: [".vercel.run"],
  },
});
