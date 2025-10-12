import type { CleanedABTest } from "@firebuzz/shared-types/campaign";
import { ConvexError, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { type ActionCtx, internalAction } from "../../_generated/server";
import { engineAPIClient } from "../../lib/engine";
import { ERRORS } from "../../utils/errors";
import { buildCampaignConfig, serializeConfig } from "./helpers/configBuilder";

interface KVPayload {
	key: string;
	value: string;
	options: {
		metadata: Record<string, unknown>;
	};
}

/**
 * Publish campaign config to KV store for CF Worker
 */
export const storeCampaignConfigInKV = internalAction({
	args: {
		campaignId: v.id("campaigns"),
		type: v.union(v.literal("preview"), v.literal("production")),
		domainIds: v.optional(v.array(v.id("customDomains"))),
	},
	handler: async (ctx, args) => {
		// Fetch and validate campaign
		const campaign = await ctx.runQuery(
			internal.collections.campaigns.queries.getByIdInternal,
			{ id: args.campaignId },
		);

		if (!campaign) {
			throw new ConvexError({
				message: "Campaign not found",
				data: { campaignId: args.campaignId },
			});
		}

		// Build and validate config
		const config = buildCampaignConfig(
			campaign.nodes,
			campaign.edges,
			campaign.campaignSettings,
			{
				_id: campaign._id,
				primaryLanguage: campaign.primaryLanguage,
				projectId: campaign.projectId,
				workspaceId: campaign.workspaceId,
			},
		);

		const validationResult = await ctx.runQuery(
			internal.collections.campaigns.validation.getCampaignValidationInternal,
			{ campaignId: campaign._id },
		);

		if (!validationResult?.canPublish) {
			throw new ConvexError({
				message: "Campaign validation failed - cannot publish",
			});
		}

		// Prepare serialized config
		const serializedConfig = serializeConfig(config);
		const kvPayloads: KVPayload[] = [];

		// Handle preview publishing
		if (args.type === "preview") {
			kvPayloads.push({
				key: `campaign:preview:${campaign._id}`,
				value: serializedConfig,
				options: { metadata: {} },
			});
		}

		// Handle production publishing
		if (args.type === "production") {
			// Fetch workspace and project in parallel
			const [workspace, project] = await Promise.all([
				ctx.runQuery(internal.collections.workspaces.queries.getByIdInternal, {
					id: campaign.workspaceId,
				}),
				ctx.runQuery(internal.collections.projects.queries.getByIdInternal, {
					id: campaign.projectId,
				}),
			]);

			if (!workspace) {
				throw new ConvexError({
					message: "Workspace not found",
					data: { workspaceId: campaign.workspaceId },
				});
			}

			if (!project) {
				throw new ConvexError({
					message: "Project not found",
					data: { projectId: campaign.projectId },
				});
			}

			// Get project domain for KV key generation
			const projectDomains = await ctx.runQuery(
				internal.collections.domains.project.queries.getByProjectIdInternal,
				{ projectId: campaign.projectId },
			);

			if (!projectDomains || projectDomains.length === 0) {
				throw new ConvexError({
					message: "Project domain not found",
					data: { projectId: campaign.projectId },
				});
			}

			const projectDomain = projectDomains[0]!;

			// Add project domain key
			kvPayloads.push({
				key: `campaign:${projectDomain.subdomain}.${projectDomain.domain}:${campaign.slug}`,
				value: serializedConfig,
				options: { metadata: {} },
			});

			// Handle custom domains if provided
			if (args.domainIds && args.domainIds.length > 0) {
				const domains = await fetchAndValidateDomains(ctx, args.domainIds);

				// Add KV entries for each custom domain
				for (const domain of domains) {
					kvPayloads.push({
						key: `campaign:${domain.hostname}:${campaign.slug}`,
						value: serializedConfig,
						options: { metadata: {} },
					});
				}
			}
		}

		// Store all configs in KV
		await storeConfigsInKV(kvPayloads);

		return { success: true };
	},
});

export const syncABTest = internalAction({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, { campaignId }) => {
		// Fetch and validate campaign
		const campaign = await ctx.runQuery(
			internal.collections.campaigns.queries.getByIdInternal,
			{ id: campaignId },
		);

		if (!campaign) {
			throw new ConvexError({
				message: "Campaign not found",
				data: { campaignId: campaignId },
			});
		}

		// Build and validate config
		const config = buildCampaignConfig(
			campaign.nodes,
			campaign.edges,
			campaign.campaignSettings,
			{
				_id: campaign._id,
				primaryLanguage: campaign.primaryLanguage,
				projectId: campaign.projectId,
				workspaceId: campaign.workspaceId,
			},
		);

		const notDraftAbTests = config.segments
			.flatMap((segment) => {
				return segment.abTests;
			})
			.filter((abTest) => abTest && abTest.status !== "draft")
			.filter((abTest) => abTest !== undefined) as CleanedABTest[];

		if (notDraftAbTests.length === 0) {
			return { success: true };
		}

		const promises = notDraftAbTests.map(async (abTest) => {
			try {
				await engineAPIClient.do.abtest.sync[":campaignId"].$post({
					param: {
						campaignId: campaignId,
					},
					json: {
						config: abTest,
					},
				});
			} catch (error) {
				console.error(`Failed to sync AB test ${abTest.id}:`, error);
			}
		});

		try {
			await Promise.all(promises);
		} catch (error) {
			console.error("Failed to sync AB tests:", error);
			throw new ConvexError({
				message: "Failed to sync AB tests",
				data: {
					error: error instanceof Error ? error.message : "Unknown error",
				},
			});
		}

		return { success: true };
	},
});

/**
 * Fetch and validate domains
 */
async function fetchAndValidateDomains(
	ctx: ActionCtx,
	domainIds: Id<"customDomains">[],
): Promise<Doc<"customDomains">[]> {
	const fetchedDomains = await asyncMap(domainIds, async (domainId) => {
		try {
			return await ctx.runQuery(
				internal.collections.domains.custom.queries.getByIdInternal,
				{ id: domainId },
			);
		} catch (error) {
			console.error(`Failed to fetch domain ${domainId}:`, error);
			return null;
		}
	});

	const validDomains = fetchedDomains.filter(
		(domain): domain is Doc<"customDomains"> => domain !== null,
	);

	if (validDomains.length !== domainIds.length) {
		throw new ConvexError({
			message: "One or more domains not found",
		});
	}

	return validDomains;
}

/**
 * Store multiple configs in KV store
 */
async function storeConfigsInKV(payloads: KVPayload[]): Promise<void> {
	if (payloads.length === 0) {
		return;
	}

	try {
		const promises = payloads.map((payload) =>
			engineAPIClient.kv.campaign.$post({ json: payload }),
		);

		const results = await Promise.allSettled(promises);

		const failures = results
			.map((result, index) => ({ result, payload: payloads[index] }))
			.filter(({ result }) => result.status === "rejected");

		if (failures.length > 0) {
			const failedKeys = failures
				.map(({ payload }) => payload?.key)
				.filter(Boolean);
			console.error("Failed to store configs:", failures);

			throw new ConvexError({
				message: "Failed to store some configurations in KV",
				data: { failedKeys, totalFailed: failures.length },
			});
		}
	} catch (error) {
		// If it's already a ConvexError, re-throw it
		if (error instanceof ConvexError) {
			throw error;
		}

		console.error("KV storage error:", error);
		throw new ConvexError({
			message: ERRORS.SOMETHING_WENT_WRONG,
			data: { error: error instanceof Error ? error.message : "Unknown error" },
		});
	}
}
