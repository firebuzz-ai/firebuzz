import type { BuildResult } from "./build.js";
import type { EnvironmentConfig } from "./config.js";

interface KvUploadPayload {
	key: string;
	value: string;
	options: {
		expiration?: number;
		expirationTtl?: number;
		metadata?: Record<string, unknown>;
	};
}

/**
 * Upload template files to Cloudflare KV via Engine API
 */
export async function uploadToKV(
	config: EnvironmentConfig,
	templateName: string,
	files: BuildResult,
): Promise<void> {
	const apiUrl = `${config.engineApiUrl}/api/v1/kv/assets`;

	const uploads: Array<{ key: string; value: string; description: string }> = [
		{
			key: `template:${templateName}`,
			value: files.html,
			description: "HTML",
		},
		{
			key: `template:${templateName}:assets:script`,
			value: files.js,
			description: "JavaScript",
		},
		{
			key: `template:${templateName}:assets:styles`,
			value: files.css,
			description: "CSS",
		},
	];

	for (const { key, value, description } of uploads) {
		const payload: KvUploadPayload = {
			key,
			value,
			options: {
				metadata: {
					uploadedBy: "template-cli",
					uploadedAt: new Date().toISOString(),
				},
			},
		};

		try {
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.serviceToken}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			const result = (await response.json()) as {
				success: boolean;
				message?: string;
			};
			if (!result.success) {
				throw new Error(result.message || "Upload failed");
			}
		} catch (error) {
			throw new Error(`Failed to upload ${description} to KV: ${error}`);
		}
	}
}
