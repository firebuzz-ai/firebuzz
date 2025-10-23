import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectRoot } from "./config.js";

export interface BuildResult {
	html: string;
	js: string;
	css: string;
}

/**
 * Build a template and transform asset paths
 */
export function buildTemplate(templateName: string): BuildResult {
	const projectRoot = getProjectRoot();
	const templatePath = join(projectRoot, "templates", templateName);
	const distPath = join(templatePath, "dist");

	// Run build command
	try {
		execSync("pnpm run build", {
			cwd: templatePath,
			stdio: "pipe",
			env: {
				...process.env,
				NODE_ENV: "production",
			},
		});
	} catch (error) {
		throw new Error(`Failed to build template: ${error}`);
	}

	// Read index.html
	const htmlPath = join(distPath, "index.html");
	let html = readFileSync(htmlPath, "utf-8");

	// Find asset files in dist/assets
	const assetsPath = join(distPath, "assets");
	const assetFiles = readdirSync(assetsPath);

	// Find the main JS and CSS files (they typically have hashes)
	const jsFile = assetFiles.find(
		(f) => f.endsWith(".js") && !f.includes("chunk"),
	);
	const cssFile = assetFiles.find((f) => f.endsWith(".css"));

	if (!jsFile || !cssFile) {
		throw new Error(`Could not find JS or CSS files in ${assetsPath}`);
	}

	// Read JS and CSS content
	const js = readFileSync(join(assetsPath, jsFile), "utf-8");
	const css = readFileSync(join(assetsPath, cssFile), "utf-8");

	// Transform HTML to update asset paths
	// Replace: /assets/${jsFile} → /template/${templateName}/assets/script
	// Replace: /assets/${cssFile} → /template/${templateName}/assets/styles
	html = html
		.replace(`/assets/${jsFile}`, `/template/${templateName}/assets/script`)
		.replace(`/assets/${cssFile}`, `/template/${templateName}/assets/styles`);

	return {
		html,
		js,
		css,
	};
}
