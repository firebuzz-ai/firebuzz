import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type Environment = "dev" | "preview" | "production";

export interface EnvironmentConfig {
	engineApiUrl: string;
	kvNamespaceId: string;
	r2BucketName: string;
	r2AccountId: string;
	r2AccessKeyId: string;
	r2SecretAccessKey: string;
	r2PublicUrl: string;
	serviceToken: string;
	cloudflareApiToken: string;
}

const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

/**
 * Parse wrangler.jsonc to get KV namespace IDs
 */
function getKvNamespaceId(env: Environment): string {
	const wranglerPath = join(PROJECT_ROOT, "apps/engine/wrangler.jsonc");
	const wranglerContent = readFileSync(wranglerPath, "utf-8");

	// Remove comments from JSONC
	const jsonContent = wranglerContent
		.replace(/\/\/.*$/gm, "")
		.replace(/\/\*[\s\S]*?\*\//g, "");
	const wrangler = JSON.parse(jsonContent);

	if (env === "dev") {
		const assets = wrangler.kv_namespaces?.find(
			(kv: { binding: string }) => kv.binding === "ASSETS",
		);
		return assets?.id;
	}

	const envConfig = wrangler.env?.[env];
	const assets = envConfig?.kv_namespaces?.find(
		(kv: { binding: string }) => kv.binding === "ASSETS",
	);
	return assets?.id;
}

/**
 * Load environment-specific configuration
 */
function loadEnvFile(env: Environment): Record<string, string> {
	const envFiles: Record<Environment, string> = {
		dev: ".env.local",
		preview: ".env.preview.local",
		production: ".env.production.local",
	};

	const envPath = join(PROJECT_ROOT, envFiles[env]);
	const envContent = readFileSync(envPath, "utf-8");

	const envVars: Record<string, string> = {};
	for (const line of envContent.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const [key, ...valueParts] = trimmed.split("=");
		if (key && valueParts.length > 0) {
			envVars[key.trim()] = valueParts
				.join("=")
				.trim()
				.replace(/^["']|["']$/g, "");
		}
	}

	return envVars;
}

/**
 * Get configuration for a specific environment
 */
export function getConfig(env: Environment): EnvironmentConfig {
	const envVars = loadEnvFile(env);
	const kvNamespaceId = getKvNamespaceId(env);

	const engineApiUrls: Record<Environment, string> = {
		dev: envVars.ENGINE_URL || "http://localhost:8787",
		preview: envVars.ENGINE_URL || "https://engine-preview.getfirebuzz.com",
		production: envVars.ENGINE_URL || "https://engine.getfirebuzz.com",
	};

	// Use existing R2_BUCKET variable from env files
	const r2BucketName = envVars.R2_BUCKET || "";

	// Extract account ID from R2_ENDPOINT if CLOUDFLARE_ACCOUNT_ID not set
	let r2AccountId = envVars.CLOUDFLARE_ACCOUNT_ID || "";
	if (!r2AccountId && envVars.R2_ENDPOINT) {
		// Extract from format: https://{accountId}.r2.cloudflarestorage.com
		const match = envVars.R2_ENDPOINT.match(
			/https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/,
		);
		if (match?.[1]) {
			r2AccountId = match[1];
		}
	}

	// Get R2 public URL based on environment
	const r2PublicUrls: Record<Environment, string> = {
		dev: envVars.NEXT_PUBLIC_R2_PUBLIC_URL || "https://cdn-dev.getfirebuzz.com",
		preview:
			envVars.NEXT_PUBLIC_R2_PUBLIC_URL ||
			"https://cdn-preview.getfirebuzz.com",
		production:
			envVars.NEXT_PUBLIC_R2_PUBLIC_URL || "https://cdn.getfirebuzz.com",
	};

	return {
		engineApiUrl: engineApiUrls[env],
		kvNamespaceId,
		r2BucketName,
		r2AccountId,
		r2AccessKeyId: envVars.R2_ACCESS_KEY_ID || "",
		r2SecretAccessKey: envVars.R2_SECRET_ACCESS_KEY || "",
		r2PublicUrl: r2PublicUrls[env],
		serviceToken: envVars.ENGINE_SERVICE_TOKEN || "",
		cloudflareApiToken: envVars.CLOUDFLARE_API_TOKEN || "",
	};
}

/**
 * Get list of available templates
 */
export function getAvailableTemplates(): string[] {
	const templatesPath = join(PROJECT_ROOT, "templates");

	return readdirSync(templatesPath).filter((name: string) => {
		const fullPath = join(templatesPath, name);
		return statSync(fullPath).isDirectory();
	});
}

/**
 * Get project root directory
 */
export function getProjectRoot(): string {
	return PROJECT_ROOT;
}
