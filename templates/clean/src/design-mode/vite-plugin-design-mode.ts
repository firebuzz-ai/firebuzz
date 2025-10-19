import fs from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import type { Plugin } from "vite";

/**
 * Vite plugin that enables design mode features for Firebuzz
 * - Generates Tailwind config JSON for client-side use
 * - Injects overlay script for element selection
 *
 * NOTE: This plugin does NOT modify JSX/TSX files.
 * Element tracking is done at runtime using React Fiber's _debugSource.
 */
export function firebuzzDesignMode(): Plugin {
	// Only enable in development, never in production builds
	const isDesignModeEnabled =
		process.env.NODE_ENV === "development" &&
		process.env.VITE_DESIGN_MODE !== "false";

	const projectRoot = process.cwd();
	const tailwindConfigFile = path.resolve(projectRoot, "./tailwind.config.js");
	const tailwindJsonOutfile = path.resolve(
		projectRoot,
		"./src/design-mode/tailwind.config.json",
	);
	const tailwindIntermediateFile = path.resolve(
		projectRoot,
		"./.fb-tailwind.config.js",
	);

	return {
		name: "vite-plugin-firebuzz-design-mode",
		enforce: "pre",

		async buildStart() {
			if (!isDesignModeEnabled) return;

			// Generate Tailwind config JSON for client-side use
			try {
				await generateTailwindConfig();
			} catch (error) {
				console.warn(
					"[Firebuzz Design Mode] Could not generate Tailwind config:",
					error,
				);
			}
		},

		configureServer(server) {
			if (!isDesignModeEnabled) return;

			// Watch Tailwind config for changes
			try {
				server.watcher.add(tailwindConfigFile);
				server.watcher.on("change", async (changedPath) => {
					if (
						path.normalize(changedPath) === path.normalize(tailwindConfigFile)
					) {
						await generateTailwindConfig();
					}
				});
			} catch (error) {
				console.warn(
					"[Firebuzz Design Mode] Could not watch Tailwind config:",
					error,
				);
			}
		},

		transformIndexHtml(html) {
			if (!isDesignModeEnabled) return html;

			// Inject the overlay script before </body>
			return html.replace(
				"</body>",
				`<script type="module" src="/src/design-mode/overlay.ts"></script></body>`,
			);
		},
	};

	async function generateTailwindConfig() {
		try {
			// Bundle Tailwind config using esbuild
			await esbuild.build({
				entryPoints: [tailwindConfigFile],
				outfile: tailwindIntermediateFile,
				bundle: true,
				format: "esm",
				banner: {
					js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
				},
			});

			// Import and resolve the config
			const userConfig = await import(
				`${tailwindIntermediateFile}?update=${Date.now()}`
			);

			if (!userConfig?.default) {
				throw new Error("Invalid Tailwind config structure");
			}

			// Dynamically import tailwindcss/resolveConfig
			const { default: resolveConfig } = await import(
				"tailwindcss/resolveConfig.js"
			);
			const resolvedConfig = resolveConfig(userConfig.default);

			// Write resolved config to JSON
			await fs.writeFile(
				tailwindJsonOutfile,
				JSON.stringify(resolvedConfig, null, 2),
			);

			// Clean up intermediate file
			await fs.unlink(tailwindIntermediateFile).catch(() => {});

			console.log(
				"[Firebuzz Design Mode] Generated Tailwind config JSON successfully",
			);
		} catch (error) {
			console.error("[Firebuzz Design Mode] Error generating config:", error);
			throw error;
		}
	}
}
