import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ora from "ora";
import { getProjectRoot } from "../lib/config.js";

export async function createCommand(): Promise<void> {
	console.log(chalk.bold.blue("\n🎨 Create New Template\n"));

	const projectRoot = getProjectRoot();
	const templatesDir = join(projectRoot, "templates");
	const baseTemplatePath = join(templatesDir, "base");

	// Check if base template exists
	if (!existsSync(baseTemplatePath)) {
		console.log(chalk.red("❌ Base template not found at templates/base"));
		process.exit(1);
	}

	// Ask for template name
	const templateName = await input({
		message: "Template name (kebab-case):",
		validate: (value) => {
			if (!value) return "Template name is required";
			if (!/^[a-z0-9-]+$/.test(value)) {
				return "Template name must be lowercase letters, numbers, and hyphens only";
			}
			const targetPath = join(templatesDir, value);
			if (existsSync(targetPath)) {
				return `Template "${value}" already exists`;
			}
			return true;
		},
	});

	const targetPath = join(templatesDir, templateName);

	console.log(chalk.gray(`\nCreating template: ${chalk.white(templateName)}\n`));

	// Copy base template
	const copySpinner = ora("Copying base template...").start();
	try {
		cpSync(baseTemplatePath, targetPath, {
			recursive: true,
			filter: (src) => {
				// Exclude node_modules, dist, and other build artifacts
				const relativePath = src.replace(baseTemplatePath, "");
				if (
					relativePath.includes("node_modules") ||
					relativePath.includes("/dist") ||
					relativePath.includes("/.vite") ||
					relativePath.includes("/.turbo") ||
					relativePath.includes("/build")
				) {
					return false;
				}
				return true;
			},
		});
		copySpinner.succeed(chalk.green("Copied base template"));
	} catch (error) {
		copySpinner.fail(chalk.red(`Failed to copy: ${error}`));
		process.exit(1);
	}

	// Update package.json with new name
	const updateSpinner = ora("Updating package.json...").start();
	try {
		const packageJsonPath = join(targetPath, "package.json");
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		packageJson.name = templateName;
		writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
		updateSpinner.succeed(chalk.green("Updated package.json"));
	} catch (error) {
		updateSpinner.fail(chalk.red(`Failed to update package.json: ${error}`));
		process.exit(1);
	}

	// Install dependencies
	const installSpinner = ora("Installing dependencies...").start();
	try {
		execSync("pnpm install", {
			cwd: targetPath,
			stdio: "pipe",
		});
		installSpinner.succeed(chalk.green("Installed dependencies"));
	} catch (error) {
		installSpinner.fail(chalk.red(`Failed to install dependencies: ${error}`));
		process.exit(1);
	}

	console.log(
		chalk.bold.green(`\n✅ Template "${templateName}" created successfully!\n`),
	);
	console.log(chalk.gray("Next steps:"));
	console.log(chalk.white(`  cd templates/${templateName}`));
	console.log(chalk.white("  pnpm dev"));
	console.log();
}
