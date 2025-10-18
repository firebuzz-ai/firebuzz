import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import traverse_ from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import generate_ from "@babel/generator";
import type { JSXAttribute, JSXOpeningElement } from "@babel/types";
import * as esbuild from "esbuild";
import type { Plugin } from "vite";

// Handle CommonJS default exports
const traverse = (traverse_ as any).default || traverse_;
const generate = (generate_ as any).default || generate_;

/**
 * Vite plugin that enables design mode features for Firebuzz
 * - Adds data attributes to JSX elements for tracking
 * - Injects overlay script for element selection
 * - Generates Tailwind config JSON for client-side use (Phase 2)
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

		transform(code, id) {
			if (!isDesignModeEnabled) return null;

			// Only process .tsx and .jsx files, skip node_modules and design-mode itself
			if (
				!id.includes("node_modules") &&
				/\.(tsx|jsx)$/.test(id) &&
				!id.includes("design-mode")
			) {
				try {
					return addDataAttributes(code, id);
				} catch (error) {
					console.warn(`[Firebuzz Design Mode] Error transforming ${id}:`, error);
					return null;
				}
			}

			return null;
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

	function addDataAttributes(code: string, filename: string) {
		// Parse the code with Babel
		const ast = parse(code, {
			sourceType: "module",
			plugins: ["jsx", "typescript"],
		});

		const relativePath = filename.replace(projectRoot, "");

		// Traverse the AST and add data attributes to JSX elements
		traverse(ast, {
			JSXOpeningElement(nodePath: NodePath<JSXOpeningElement>) {
				const { node } = nodePath;
				const line = node.loc?.start.line || 0;
				const column = node.loc?.start.column || 0;

				// Get element name
				let elementName = "";
				if (node.name.type === "JSXIdentifier") {
					elementName = node.name.name;
				}

				// Check if already has data-fb-id attribute
				const hasDataAttr = node.attributes.some(
					(attr: JSXAttribute | any) =>
						attr.type === "JSXAttribute" &&
						attr.name.type === "JSXIdentifier" &&
						attr.name.name === "data-fb-id",
				);

				if (hasDataAttr) return;

				// Add data attributes
				const attributes = [
					{
						type: "JSXAttribute" as const,
						name: {
							type: "JSXIdentifier" as const,
							name: "data-fb-id",
						},
						value: {
							type: "StringLiteral" as const,
							value: `${relativePath}:${line}:${column}`,
						},
					},
					{
						type: "JSXAttribute" as const,
						name: {
							type: "JSXIdentifier" as const,
							name: "data-fb-name",
						},
						value: {
							type: "StringLiteral" as const,
							value: elementName,
						},
					},
					{
						type: "JSXAttribute" as const,
						name: {
							type: "JSXIdentifier" as const,
							name: "data-fb-path",
						},
						value: {
							type: "StringLiteral" as const,
							value: relativePath,
						},
					},
					{
						type: "JSXAttribute" as const,
						name: {
							type: "JSXIdentifier" as const,
							name: "data-fb-line",
						},
						value: {
							type: "StringLiteral" as const,
							value: String(line),
						},
					},
				];

				// Add attributes to the node
				node.attributes.push(...attributes);
			},
		});

		// Generate code from modified AST
		const output = generate(ast, {
			retainLines: true,
			compact: false,
		});

		return {
			code: output.code,
			map: output.map,
		};
	}

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
