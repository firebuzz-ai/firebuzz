import { readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { EnvironmentConfig } from "./config.js";

/**
 * Create S3 client for R2
 */
function createR2Client(config: EnvironmentConfig): S3Client {
	return new S3Client({
		region: "auto",
		endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: config.r2AccessKeyId,
			secretAccessKey: config.r2SecretAccessKey,
		},
	});
}

/**
 * Upload tarball to Cloudflare R2
 */
export async function uploadToR2(
	config: EnvironmentConfig,
	templateName: string,
	tarPath: string,
): Promise<void> {
	const s3Client = createR2Client(config);

	// Read tar file
	const tarContent = readFileSync(tarPath);

	// Upload to R2
	const key = `templates/${templateName}.tar.gz`;

	try {
		await s3Client.send(
			new PutObjectCommand({
				Bucket: config.r2BucketName,
				Key: key,
				Body: tarContent,
				ContentType: "application/gzip",
			}),
		);
	} catch (error) {
		throw new Error(`Failed to upload tarball to R2: ${error}`);
	}
}

/**
 * Upload template screenshot to Cloudflare R2
 * Returns the public URL of the uploaded screenshot
 */
export async function uploadScreenshotToR2(
	config: EnvironmentConfig,
	templateName: string,
	screenshotBase64: string,
): Promise<string> {
	const s3Client = createR2Client(config);

	// Decode base64 screenshot
	const screenshotBuffer = Buffer.from(screenshotBase64, "base64");

	// Upload to R2 in templates/screenshots directory
	const key = `templates/screenshots/${templateName}.png`;

	try {
		await s3Client.send(
			new PutObjectCommand({
				Bucket: config.r2BucketName,
				Key: key,
				Body: screenshotBuffer,
				ContentType: "image/png",
			}),
		);
	} catch (error) {
		throw new Error(`Failed to upload screenshot to R2: ${error}`);
	}

	// Return public URL with cache buster to avoid CDN caching stale 404s
	const timestamp = Date.now();
	return `${config.r2PublicUrl}/${key}?v=${timestamp}`;
}
