import Cloudflare from "cloudflare";
import type { Environment, EnvironmentConfig } from "./config.js";

/**
 * Sleep helper function
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build template preview URL based on environment
 * Uses preview subdomain instead of engine subdomain
 * Adds disableFirebuzzBadge query param to remove badge from screenshot
 */
function getTemplatePreviewUrl(env: Environment, templateName: string): string {
	// Map environment to preview subdomain
	const previewUrls: Record<Environment, string> = {
		dev: "https://preview-dev.frbzz.com",
		preview: "https://preview-preview.frbzz.com",
		production: "https://preview.frbzz.com",
	};

	const url = `${previewUrls[env]}/template/${templateName}?disableFirebuzzBadge=true`;
	console.log(`Template preview URL: ${url}`);
	return url;
}

/**
 * Capture screenshot of a template using Cloudflare Browser Rendering
 * Returns base64 encoded PNG screenshot
 *
 * Note: Waits 60 seconds after being called to allow KV cache propagation
 */
export async function captureTemplateScreenshot(
	config: EnvironmentConfig,
	templateName: string,
	environment: Environment,
): Promise<string> {
	if (!config.cloudflareApiToken) {
		throw new Error("CLOUDFLARE_API_TOKEN not configured");
	}

	if (!config.r2AccountId) {
		throw new Error("CLOUDFLARE_ACCOUNT_ID not configured");
	}

	// Build template preview URL (with disableFirebuzzBadge flag)
	const templateUrl = getTemplatePreviewUrl(environment, templateName);

	console.log(
		`Waiting 60 seconds for KV/cache propagation before screenshot...`,
	);
	console.log(`Template URL: ${templateUrl}`);

	// Wait 60000 seconds for KV content to propagate through edge cache
	await sleep(60000);

	// Verify URL is accessible before capturing screenshot
	console.log(`Verifying template is accessible...`);
	try {
		const checkResponse = await fetch(templateUrl);
		console.log(`Template accessibility check: ${checkResponse.status}`);
		if (!checkResponse.ok) {
			console.warn(`Warning: Template returned status ${checkResponse.status}`);
		}
	} catch (error) {
		console.warn(`Warning: Could not verify template accessibility:`, error);
	}

	console.log(`Capturing screenshot now...`);

	// Initialize Cloudflare SDK with API token (required for Browser Rendering)
	const cloudflare = new Cloudflare({
		apiToken: config.cloudflareApiToken,
	});

	// Capture screenshot using Cloudflare Browser Rendering SDK
	try {
		const snapshot = await cloudflare.browserRendering.snapshot.create({
			account_id: config.r2AccountId,
			url: templateUrl,
			gotoOptions: {
				waitUntil: "networkidle0",
				timeout: 30000,
			},
			screenshotOptions: {
				fullPage: false,
				omitBackground: false,
			},
			viewport: {
				width: 1920,
				height: 1080,
			},
		});

		return snapshot.screenshot;
	} catch (error) {
		console.error("Screenshot error details:", error);
		throw error;
	}
}
