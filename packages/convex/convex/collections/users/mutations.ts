import type { UserJSON } from "@clerk/backend";
import { type Validator, v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { internalMutationWithTrigger } from "../../triggers";
import { getUserByExternalId } from "./utils";

export const upsertFromClerk = internalMutation({
	args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
	async handler(ctx, { data }) {
		const userAttributes = {
			firstName: data.first_name ?? undefined,
			lastName: data.last_name ?? undefined,
			fullName: `${data.first_name} ${data.last_name}`,
			imageUrl: data.image_url ?? undefined,
			email: data.email_addresses[0].email_address,
			externalId: data.id,
		};

		// Check if the user already exists
		const user = await getUserByExternalId(ctx, data.id);
		if (user === null) {
			// If the user does not exist, create a new user
			const newUserId = await ctx.db.insert("users", userAttributes);
			// Insert a personal workspace for the user
			await ctx.db.insert("workspaces", {
				externalId: data.id,
				workspaceType: "personal",
				ownerId: newUserId,
				title: `${data.first_name}'s Workspace`,
				color: "sky",
				icon: "cup",
				onboardingCompleted: false,
			});
		} else {
			// If the user exists, update the user
			await ctx.db.patch(user._id, userAttributes);
		}
	},
});

export const deleteUserWithAllDataByExternalId = internalMutationWithTrigger({
	args: { externalId: v.string() },
	handler: async (ctx, { externalId }) => {
		const user = await getUserByExternalId(ctx, externalId);
		if (user) {
			await ctx.db.delete(user._id);
		}
	},
});

export const updateCurrentProject = mutation({
	args: {
		id: v.id("users"),
		currentProject: v.optional(v.id("projects")),
	},
	handler: async (ctx, { id, currentProject }) => {
		await ctx.db.patch(id, { currentProject });
	},
});
