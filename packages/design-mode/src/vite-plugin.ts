import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/**
 * Vite plugin that enables design mode features for Firebuzz templates
 * - Injects Tailwind Play CDN for runtime CSS generation
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

	const overlayOutputPath = path.resolve(
		projectRoot,
		"./node_modules/.vite-plugin-firebuzz-design-mode/overlay.mjs",
	);

	return {
		name: "vite-plugin-firebuzz-design-mode",
		enforce: "pre",

		async buildStart() {
			if (!isDesignModeEnabled) return;

			// Copy overlay file to a location Vite can serve
			try {
				// Find the overlay source file from the package using import.meta.url
				const currentFileUrl = import.meta.url;
				const currentFilePath = fileURLToPath(currentFileUrl);
				const packageRoot = path.resolve(path.dirname(currentFilePath), "..");
				const overlaySource = path.join(packageRoot, "dist", "overlay.mjs");
				const overlaySourceMap = path.join(
					packageRoot,
					"dist",
					"overlay.mjs.map",
				);

				// Ensure output directory exists
				await fs.mkdir(path.dirname(overlayOutputPath), { recursive: true });

				// Copy the overlay file
				await fs.copyFile(overlaySource, overlayOutputPath);

				// Copy the source map file if it exists
				try {
					await fs.copyFile(overlaySourceMap, `${overlayOutputPath}.map`);
				} catch {
					// Source map is optional, ignore if not found
				}
			} catch (error) {
				console.warn(
					"[Firebuzz Design Mode] Could not copy overlay file:",
					error,
				);
			}
		},

		transformIndexHtml(html) {
			if (!isDesignModeEnabled) return html;

			// Inject Tailwind Play CDN for runtime CSS generation
			const tailwindCDN = '<script src="https://cdn.tailwindcss.com"></script>';

			// Inject the overlay script
			const overlayPath = overlayOutputPath.replace(projectRoot, "");
			const overlayScript = `<script type="module" src="${overlayPath}"></script>`;

			// Inject both in the head (Tailwind CDN) and before </body> (overlay)
			let modifiedHtml = html.replace("</head>", `${tailwindCDN}</head>`);
			modifiedHtml = modifiedHtml.replace("</body>", `${overlayScript}</body>`);

			return modifiedHtml;
		},
	};
}
