import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/overlay.ts"],
	format: ["cjs", "esm"],
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
	minify: true,
	external: ["react", "vite", "tailwindcss"],
	treeshake: true,
});
