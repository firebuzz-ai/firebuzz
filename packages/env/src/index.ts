import { z } from "zod";

/* NODE */
export const envNode = () =>
	z
		.object({
			NODE_ENV: z
				.enum(["development", "production"])
				.optional()
				.default("development"),
			PORT: z.string().optional(),
		})
		.parse(process.env);

/* VERCEL */
export const envVercel = () =>
	z
		.object({
			VERCEL_ENV: z
				.enum(["development", "preview", "production"])
				.optional()
				.default("development"),
			VERCEL_URL: z.string().optional().default("http://localhost:3000"),
			NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z
				.string()
				.optional()
				.default("http://localhost:3000"),
		})
		.parse({
			VERCEL_ENV: process.env.VERCEL_ENV,
			VERCEL_URL: process.env.VERCEL_URL,
			NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
				process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
		});

/* CONVEX */
export const envConvex = () =>
	z
		.object({
			NEXT_PUBLIC_CONVEX_URL: z.string(),
		})
		.parse({
			NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
		});

/* CLOUDFLARE  */
export const envCloudflarePublic = () =>
	z
		.object({
			NEXT_PUBLIC_R2_PUBLIC_URL: z.string(),
		})
		.parse({
			NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
		});
export const envCloudflare = () =>
	z
		.object({
			NEXT_PUBLIC_R2_PUBLIC_URL: z.string(),
			R2_ENDPOINT: z.string(),
			R2_ACCESS_KEY_ID: z.string(),
			R2_SECRET_ACCESS_KEY: z.string(),
			R2_BUCKET: z.string(),
			R2_TOKEN: z.string(),
			CLOUDFLARE_ACCOUNT_ID: z.string(),
			AI_GATEWAY_ID: z.string(),
		})
		.parse({
			NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
			R2_ENDPOINT: process.env.R2_ENDPOINT,
			R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
			R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
			R2_BUCKET: process.env.R2_BUCKET,
			R2_TOKEN: process.env.R2_TOKEN,
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			AI_GATEWAY_ID: process.env.AI_GATEWAY_ID,
		});

/* CLERK */
export const envClerk = () =>
	z
		.object({
			CLERK_SECRET_KEY: z.string().optional(),
			CLERK_WEBHOOK_SECRET: z.string().optional(),
			NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
			NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
			NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
			NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().optional(),
			NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z.string().optional(),
			NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().optional(),
			NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z.string().optional(),
		})
		.parse({
			CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
			CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
			NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
				process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
			NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
			NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
			NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
				process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
			NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:
				process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
			NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL:
				process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
			NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:
				process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
		});

/* RESEND */
export const envResend = () => {
	const parsed = z
		.object({
			RESEND_API_KEY: z.string(),
			RESEND_DOMAIN: z.string(),
		})
		.safeParse(process.env);

	if (!parsed.success) {
		throw new Error("Missing Resend environment variables.");
	}

	return parsed.data;
};

/* GOOGLE */
export const envGoogle = () =>
	z
		.object({
			GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
		})
		.parse({
			GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		});

/* OPENAI */
export const envOpenai = () => {
	const parsed = z
		.object({
			OPENAI_API_KEY: z.string(),
		})
		.safeParse(process.env);

	if (!parsed.success) {
		throw new Error("Missing OpenAI environment variables.");
	}

	return parsed.data;
};

/* AZURE */
export const envAzure = () =>
	z
		.object({
			AZURE_OPENAI_API_KEY: z.string(),
			AZURE_OPENAI_RESOURCE_NAME: z.string(),
		})
		.parse({
			AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
			AZURE_OPENAI_RESOURCE_NAME: process.env.AZURE_OPENAI_RESOURCE_NAME,
		});

/* ANTHROPIC */
export const envAnthropic = () =>
	z
		.object({
			ANTHROPIC_API_KEY: z.string(),
		})
		.parse({
			ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		});

/* FAL */
export const envFal = () =>
	z
		.object({
			FAL_API_KEY: z.string(),
		})
		.parse({
			FAL_API_KEY: process.env.FAL_API_KEY,
		});

/* UNSPLASH */
export const envUnsplash = () =>
	z
		.object({
			UNSPLASH_ACCESS_KEY: z.string(),
		})
		.parse({
			UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
		});

/* TINYBIRD */
export const envTinybird = () =>
	z
		.object({
			TINYBIRD_TOKEN: z.string(),
			TINYBIRD_BASE_URL: z.string(),
		})
		.parse({
			TINYBIRD_TOKEN: process.env.TINYBIRD_TOKEN,
			TINYBIRD_BASE_URL: process.env.TINYBIRD_BASE_URL,
		});
