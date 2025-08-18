import { sleep } from "@firebuzz/utils";
import Cloudflare from "cloudflare";
import { ConvexError, v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import { action, internalAction } from "../../../_generated/server";
import { cloudflare } from "../../../lib/cloudflare";
import { engineAPIClient } from "../../../lib/engine";
import { ERRORS } from "../../../utils/errors";

export const createCustomDomain = action({
	args: {
		hostname: v.string(),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
	},
	handler: async (
		ctx,
		{ hostname, workspaceId, projectId },
	): Promise<{
		success: boolean;
		customDomainId: Id<"customDomains">;
		cloudflareData: Cloudflare.CustomHostnames.CustomHostnameCreateResponse;
	}> => {
		try {
			// Get user context
			const clerkUser = await ctx.auth.getUserIdentity();

			if (!clerkUser) {
				throw new Error(ERRORS.UNAUTHORIZED);
			}

			const user = await ctx.runQuery(
				internal.collections.users.queries.getByExternalIdInternal,
				{
					externalId: clerkUser.subject,
				},
			);

			if (!user) {
				throw new Error(ERRORS.NOT_FOUND);
			}

			// Check if project already has a custom domain
			const existingDomain = await ctx.runQuery(
				internal.collections.domains.custom.queries.getByProjectIdInternal,
				{
					projectId,
				},
			);

			if (existingDomain) {
				throw new ConvexError(
					"This project already has a custom domain. Each project can only have one custom domain.",
				);
			}

			// Create custom hostname via Cloudflare API
			const customHostname = await cloudflare.customHostnames.create({
				zone_id: process.env.CLOUDFLARE_ZONE_ID!,
				hostname,
				ssl: {
					method: "txt",
					type: "dv",
				},
			});

			// Store the Config in KV
			await engineAPIClient.kv.domain.$post({
				json: {
					key: `${hostname}`,
					value: JSON.stringify({
						w: workspaceId,
						p: projectId,
						e: process.env.ENVIRONMENT,
						t: "c",
					}),
					options: {
						metadata: {},
					},
				},
			});

			// Wait for 4 seconds to ensure the DNS is propagated
			await sleep(4000);

			// Get latest status from Cloudflare
			const customHostnameLast = await cloudflare.customHostnames.get(
				customHostname.id,
				{
					zone_id: process.env.CLOUDFLARE_ZONE_ID!,
				},
			);

			const verificationRecord =
				customHostnameLast.ssl?.validation_records &&
				customHostnameLast.ssl.validation_records.length > 0 &&
				customHostnameLast.ssl.validation_records[0].txt_name &&
				customHostnameLast.ssl.validation_records[0].txt_value
					? [
							{
								name: customHostnameLast.ssl.validation_records[0].txt_name,
								type: "txt" as const,
								value: customHostnameLast.ssl.validation_records[0].txt_value,
							},
						]
					: [];

			// Store in Convex database
			const customDomainId = await ctx.runMutation(
				internal.collections.domains.custom.mutations.createInternal,
				{
					hostname,
					status: customHostname.status as Doc<"customDomains">["status"],
					cloudflareHostnameId: customHostname.id,
					sslStatus: customHostname.ssl
						?.status as Doc<"customDomains">["sslStatus"],
					sslExpiresAt: customHostname.ssl?.expires_on,
					verificationRecord: [
						{
							name: hostname.split(".")[0],
							type: "cname",
							value: "customers.frbzz.com",
						},
						...verificationRecord,
					],
					workspaceId,
					projectId,
					createdBy: user._id,
				},
			);

			return {
				success: true,
				customDomainId,
				cloudflareData: customHostname,
			};
		} catch (error) {
			console.error("Error creating custom domain:", error);

			// Handle Cloudflare API errors
			if (error instanceof Cloudflare.APIError) {
				throw new ConvexError(
					`Cloudflare API error: ${error.errors[0].message}`,
				);
			}

			if (error instanceof ConvexError) {
				throw error;
			}

			throw new ConvexError("Something went wrong");
		}
	},
});

export const deleteCustomDomain = action({
	args: {
		customDomainId: v.id("customDomains"),
	},
	handler: async (ctx, { customDomainId }) => {
		try {
			// Get user context for authorization
			const clerkUser = await ctx.auth.getUserIdentity();
			if (!clerkUser) {
				throw new Error(ERRORS.UNAUTHORIZED);
			}
			const user = await ctx.runQuery(
				internal.collections.users.queries.getByExternalIdInternal,
				{
					externalId: clerkUser.subject,
				},
			);

			// Get domain from database
			const domain = await ctx.runQuery(
				internal.collections.domains.custom.queries.getByIdInternal,
				{
					id: customDomainId,
				},
			);

			if (!domain) {
				throw new Error("Custom domain not found");
			}

			// Check authorization
			if (domain.workspaceId !== user?.currentWorkspaceId) {
				throw new Error("You are not allowed to delete this custom domain");
			}

			// Delete from Cloudflare
			await cloudflare.customHostnames.delete(domain.cloudflareHostnameId, {
				zone_id: process.env.CLOUDFLARE_ZONE_ID!,
			});

			// Delete from database
			await ctx.runMutation(
				internal.collections.domains.custom.mutations.deletePermanent,
				{
					id: customDomainId,
				},
			);

			return {
				success: true,
				message: "Custom domain deleted successfully",
			};
		} catch (error) {
			console.error("Error deleting custom domain:", error);

			// Handle Cloudflare API errors
			if (error instanceof Cloudflare.APIError) {
				throw new Error(`Cloudflare API error: ${error.message}`);
			}

			throw new Error(`Failed to delete custom domain: ${error}`);
		}
	},
});

export const syncWithCloudflare = action({
	args: {
		customDomainId: v.id("customDomains"),
	},
	handler: async (ctx, { customDomainId }) => {
		try {
			// Get user context
			const clerkUser = await ctx.auth.getUserIdentity();

			if (!clerkUser) {
				throw new Error(ERRORS.UNAUTHORIZED);
			}

			const user = await ctx.runQuery(
				internal.collections.users.queries.getByExternalIdInternal,
				{
					externalId: clerkUser.subject,
				},
			);

			if (!user) {
				throw new Error(ERRORS.NOT_FOUND);
			}
			// Get domain from database
			const domain = await ctx.runQuery(
				internal.collections.domains.custom.queries.getByIdInternal,
				{
					id: customDomainId,
				},
			);

			if (!domain) {
				throw new Error("Custom domain not found");
			}

			// Get latest status from Cloudflare
			const customHostname = await cloudflare.customHostnames.get(
				domain.cloudflareHostnameId,
				{
					zone_id: process.env.CLOUDFLARE_ZONE_ID!,
				},
			);

			const verificationRecord =
				customHostname.ssl?.validation_records &&
				customHostname.ssl.validation_records.length > 0 &&
				customHostname.ssl.validation_records[0].txt_name &&
				customHostname.ssl.validation_records[0].txt_value
					? [
							{
								name: customHostname.ssl.validation_records[0].txt_name,
								type: "txt" as const,
								value: customHostname.ssl.validation_records[0].txt_value,
							},
						]
					: [];

			// Update domain status in database
			await ctx.runMutation(
				internal.collections.domains.custom.mutations.updateStatusInternal,
				{
					id: customDomainId,
					status: customHostname.status as Doc<"customDomains">["status"],
					sslStatus: customHostname.ssl
						?.status as Doc<"customDomains">["sslStatus"],
					sslExpiresAt: customHostname.ssl?.expires_on,
					lastCheckedAt: new Date().toISOString(),
					verificationRecord: [
						domain.verificationRecord[0],
						...verificationRecord,
					],
				},
			);

			return {
				success: true,
				domain: customHostname,
			};
		} catch (error) {
			console.error("Error syncing with Cloudflare:", error);

			// Handle Cloudflare API errors
			if (error instanceof Cloudflare.APIError) {
				throw new Error(`Cloudflare API error: ${error.message}`);
			}

			throw new Error(`Failed to sync with Cloudflare: ${error}`);
		}
	},
});

// Helper action to list all custom hostnames from Cloudflare (for debugging/admin purposes)
export const listCloudflareHostnames = internalAction({
	args: {
		hostname: v.optional(v.string()),
		page: v.optional(v.number()),
		per_page: v.optional(v.number()),
	},
	handler: async (_ctx, { hostname, page, per_page }) => {
		try {
			const result = await cloudflare.customHostnames.list({
				zone_id: process.env.CLOUDFLARE_ZONE_ID!,
				hostname,
				page,
				per_page,
			});

			return {
				success: true,
				data: result,
			};
		} catch (error) {
			console.error("Error listing Cloudflare hostnames:", error);

			if (error instanceof Cloudflare.APIError) {
				throw new Error(`Cloudflare API error: ${error.message}`);
			}

			throw new Error(`Failed to list hostnames: ${error}`);
		}
	},
});
