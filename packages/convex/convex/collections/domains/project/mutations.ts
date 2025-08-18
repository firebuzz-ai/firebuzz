import { ConvexError, v } from "convex/values";
import { internal } from "../../../../src";
import { retrier } from "../../../components/actionRetrier";
import {
	internalMutationWithTrigger,
	mutationWithTrigger,
} from "../../../triggers";
import { ERRORS } from "../../../utils/errors";
import { getCurrentUserWithWorkspace } from "../../users/utils";
import { checkIsValidSubdomain, checkReservedKeys } from "./helpers";

export const createInternal = internalMutationWithTrigger({
	args: {
		subdomain: v.string(),
		domain: v.string(),
		workspaceId: v.id("workspaces"),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		// Check if the subdomain is available
		const isAvailable = await ctx.runQuery(
			internal.collections.domains.project.queries.checkSubdomainIsAvailable,
			{
				subdomain: args.subdomain,
			},
		);

		if (!isAvailable) {
			throw new ConvexError("Subdomain is not available");
		}

		const projectDomainId = await ctx.db.insert("projectDomains", {
			...args,
		});

		await retrier.run(
			ctx,
			internal.collections.domains.project.actions.storeConfigInKV,
			{
				projectDomainId,
			},
		);

		return projectDomainId;
	},
});

export const update = mutationWithTrigger({
	args: {
		projectDomainId: v.id("projectDomains"),
		subdomain: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		if (!user) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		const projectDomain = await ctx.db.get(args.projectDomainId);

		if (!projectDomain) {
			throw new ConvexError(ERRORS.NOT_FOUND);
		}

		if (projectDomain.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError(ERRORS.UNAUTHORIZED);
		}

		if (!checkIsValidSubdomain(args.subdomain)) {
			throw new ConvexError("Subdomain is not valid");
		}

		if (checkReservedKeys(args.subdomain)) {
			throw new ConvexError("Subdomain is reserved");
		}

		// Check if the subdomain is available
		const isAvailable = await ctx.runQuery(
			internal.collections.domains.project.queries.checkSubdomainIsAvailable,
			{
				subdomain: args.subdomain,
				existingId: args.projectDomainId,
			},
		);

		if (!isAvailable) {
			throw new ConvexError("Subdomain is not available");
		}

		await ctx.db.patch(args.projectDomainId, {
			subdomain: args.subdomain,
			updatedAt: new Date().toISOString(),
			updatedBy: user._id,
		});

		await retrier.run(
			ctx,
			internal.collections.domains.project.actions.storeConfigInKV,
			{
				projectDomainId: args.projectDomainId,
			},
		);
	},
});
