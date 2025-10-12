#!/usr/bin/env node

/**
 * Convert Markdown files to TypeScript constant strings
 *
 * Usage:
 *   node scripts/md-to-ts.js <input.md> <output.ts> [exportName]
 *
 * Examples:
 *   node scripts/md-to-ts.js prompts/system.md prompts/system.ts SYSTEM_PROMPT
 *   node scripts/md-to-ts.js README.md readme-content.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	blue: "\x1b[34m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
	log(`✗ Error: ${message}`, "red");
}

function success(message) {
	log(`✓ ${message}`, "green");
}

function info(message) {
	log(message, "blue");
}

function escapeTemplateString(str) {
	return str
		.replace(/\\/g, "\\\\") // Escape backslashes
		.replace(/`/g, "\\`") // Escape backticks
		.replace(/\${/g, "\\${"); // Escape template literal expressions
}

function getExportName(filePath, defaultName) {
	if (defaultName) return defaultName;

	const baseName = path.basename(filePath, path.extname(filePath));
	return baseName
		.split(/[-_]/)
		.map((word) => word.toUpperCase())
		.join("_");
}

function convertMdToTs(inputPath, outputPath, exportName) {
	try {
		// Resolve absolute paths
		const absoluteInputPath = path.resolve(process.cwd(), inputPath);
		const absoluteOutputPath = path.resolve(process.cwd(), outputPath);

		// Check if input file exists
		if (!fs.existsSync(absoluteInputPath)) {
			error(`Input file not found: ${absoluteInputPath}`);
			process.exit(1);
		}

		// Read markdown file
		info(`Reading: ${path.relative(process.cwd(), absoluteInputPath)}`);
		const markdownContent = fs.readFileSync(absoluteInputPath, "utf-8");

		// Generate export name
		const varName = getExportName(inputPath, exportName);

		// Escape special characters for template literal
		const escapedContent = escapeTemplateString(markdownContent);

		// Create TypeScript content
		const tsContent = `export const ${varName} = \`${escapedContent}\`;\n`;

		// Ensure output directory exists
		const outputDir = path.dirname(absoluteOutputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
			info(`Created directory: ${path.relative(process.cwd(), outputDir)}`);
		}

		// Write TypeScript file
		fs.writeFileSync(absoluteOutputPath, tsContent, "utf-8");

		success(
			`Converted to: ${path.relative(process.cwd(), absoluteOutputPath)}`,
		);
		info(`Export name: ${varName}`);

		// Show file sizes
		const inputSize = fs.statSync(absoluteInputPath).size;
		const outputSize = fs.statSync(absoluteOutputPath).size;
		log(`\nFile sizes: ${inputSize} bytes → ${outputSize} bytes`, "yellow");
	} catch (err) {
		error(err.message);
		process.exit(1);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
	log("Markdown to TypeScript Converter", "blue");
	log("==================================\n", "blue");
	log("Usage:", "yellow");
	log(
		"  node scripts/md-to-ts.js <input.md> <output.ts> [exportName]\n",
		"reset",
	);
	log("Examples:", "yellow");
	log(
		"  node scripts/md-to-ts.js prompts/system.md prompts/system.ts SYSTEM_PROMPT",
		"reset",
	);
	log("  node scripts/md-to-ts.js README.md readme-content.ts\n", "reset");
	process.exit(1);
}

const [inputPath, outputPath, exportName] = args;

convertMdToTs(inputPath, outputPath, exportName);
