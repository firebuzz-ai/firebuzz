import { Tinybird } from "@chronark/zod-bird";
import { formatToDateTime64 } from "@firebuzz/utils";
import { zid } from "convex-helpers/server/zod";
import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "../_generated/server";

const token = process.env.TINYBIRD_TOKEN;
const baseUrl = process.env.TINYBIRD_BASE_URL;

if (!token || !baseUrl) {
	throw new Error("TINYBIRD_TOKEN or TINYBIRD_BASE_URL is not set");
}

const tinybird = new Tinybird({
	baseUrl,
	token,
});

// Credit Usage Schema based on credit_usage_v1.datasource
const creditUsageSchema = z.object({
	amount: z.number(),
	type: z.string(),
	idempotencyKey: z.string(),
	createdAt: z.string().datetime(),
	workspaceId: zid("workspaces"),
	userId: zid("users"),
	projectId: zid("projects"),
});

// Build ingest endpoint for credit usage
export const ingestCreditUsage = tinybird.buildIngestEndpoint({
	datasource: "credit_usage_v1",
	event: creditUsageSchema,
});

export const ingestCreditUsageAction = internalAction({
	args: {
		amount: v.number(),
		type: v.string(),
		idempotencyKey: v.string(),
		workspaceId: v.id("workspaces"),
		userId: v.id("users"),
		projectId: v.id("projects"),
	},
	handler: async (_ctx, args) => {
		try {
			const createdAt = formatToDateTime64();

			await ingestCreditUsage({
				...args,
				createdAt,
			});
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
});
