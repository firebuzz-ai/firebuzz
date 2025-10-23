import { select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { buildTemplate } from "../lib/build.js";
import {
	type Environment,
	getAvailableTemplates,
	getConfig,
} from "../lib/config.js";
import { uploadToKV } from "../lib/kv.js";
import { uploadScreenshotToR2, uploadToR2 } from "../lib/r2.js";
import { captureTemplateScreenshot } from "../lib/screenshot.js";
import { createTarball } from "../lib/tar.js";

export async function packCommand(): Promise<void> {
	console.log(chalk.bold.blue("\n📦 Firebuzz Template Packer\n"));

	// Step 1: Select template
	const templates = getAvailableTemplates();
	const templateName = await select({
		message: "Select a template:",
		choices: templates.map((name) => ({ value: name, name })),
	});

	// Step 2: Select environment
	const environment = await select<Environment>({
		message: "Select environment:",
		choices: [
			{ value: "dev", name: "Development" },
			{ value: "preview", name: "Preview" },
			{ value: "production", name: "Production" },
		],
	});

	console.log(
		chalk.gray(
			`\nPacking template: ${chalk.white(templateName)} for ${chalk.white(environment)}\n`,
		),
	);

	// Load environment config
	const config = getConfig(environment);

	// Step 3: Build template
	const buildSpinner = ora("Building template...").start();
	try {
		const buildResult = buildTemplate(templateName);
		buildSpinner.succeed(
			chalk.green(
				`Built template (HTML: ${(buildResult.html.length / 1024).toFixed(1)}KB, JS: ${(buildResult.js.length / 1024).toFixed(1)}KB, CSS: ${(buildResult.css.length / 1024).toFixed(1)}KB)`,
			),
		);

		// Step 4: Create tarball
		const tarSpinner = ora("Creating tarball...").start();
		const tarResult = createTarball(templateName);
		tarSpinner.succeed(chalk.green(`Created tarball (${tarResult.sizeKb}KB)`));

		// Step 5: Upload to KV
		const kvSpinner = ora("Uploading to Cloudflare KV...").start();
		await uploadToKV(config, templateName, buildResult);
		kvSpinner.succeed(chalk.green("Uploaded to KV"));

		// Step 6: Capture screenshot (waits 60s for cache propagation)
		const screenshotSpinner = ora(
			"Capturing template screenshot (waiting for cache...)",
		).start();
		const screenshot = await captureTemplateScreenshot(
			config,
			templateName,
			environment,
		);
		const screenshotUrl = await uploadScreenshotToR2(
			config,
			templateName,
			screenshot,
		);
		screenshotSpinner.succeed(chalk.green("Screenshot captured and uploaded"));

		// Step 7: Upload tarball to R2
		const r2Spinner = ora("Uploading tarball to Cloudflare R2...").start();
		await uploadToR2(config, templateName, tarResult.tarPath);
		r2Spinner.succeed(chalk.green("Uploaded tarball to R2"));

		console.log(
			chalk.bold.green(
				`\n✅ Successfully packed and published ${templateName} to ${environment}!\n`,
			),
		);
		console.log(chalk.gray(`Screenshot URL: ${chalk.white(screenshotUrl)}`));
	} catch (error) {
		buildSpinner.fail(chalk.red(`Failed: ${error}`));
		process.exit(1);
	}
}
