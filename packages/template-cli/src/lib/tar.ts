import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getProjectRoot } from "./config.js";

export interface TarResult {
	tarPath: string;
	sizeKb: number;
}

/**
 * Create a tarball for a template
 * Mirrors the logic from pack-templates.sh
 */
export function createTarball(templateName: string): TarResult {
	const projectRoot = getProjectRoot();
	const templatePath = join(projectRoot, "templates", templateName);
	const outputDir = join(projectRoot, "dist/templates");

	// Create output directory if it doesn't exist
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	const outputPath = join(outputDir, `${templateName}.tar.gz`);

	// Exclusion patterns matching pack-templates.sh
	const excludes = [
		"node_modules",
		".pnpm-store",
		".yarn",
		".npm",
		"dist",
		"build",
		"out",
		".turbo",
		".next",
		".vite",
		".vercel",
		".cache",
		"*.tar",
		"*.tar.gz",
		"*.tgz",
		"*.zip",
		"*.log",
		".DS_Store",
		"coverage",
		".env.local",
		".env.*.local",
	];

	const excludeArgs = excludes.map((pattern) => `--exclude="${pattern}"`).join(" ");

	// Create tarball
	const command = `tar -czf "${outputPath}" -C "${templatePath}" ${excludeArgs} .`;

	try {
		execSync(command, { stdio: "pipe" });
	} catch (error) {
		throw new Error(`Failed to create tarball: ${error}`);
	}

	// Get file size
	const statCommand = `du -k "${outputPath}" | cut -f1`;
	const sizeKb = Number.parseInt(execSync(statCommand, { encoding: "utf-8" }).trim(), 10);

	return {
		tarPath: outputPath,
		sizeKb,
	};
}
