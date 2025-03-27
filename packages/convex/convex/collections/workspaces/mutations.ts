import { ConvexError } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../users/utils";
import { workspaceSchema } from "./schema";

export const create = mutation({
	args: {
		title: workspaceSchema.fields.title,
		color: workspaceSchema.fields.color,
		icon: workspaceSchema.fields.icon,
	},
	handler: async (ctx, args) => {
		const { title, color, icon } = args;

		const clerkUser = await ctx.auth.getUserIdentity();

		if (!clerkUser) {
			console.log("clerkUser is null");
			throw new ConvexError("Unauthorized");
		}

		const user = await getUserByExternalId(ctx, clerkUser.subject); // clerkUser.subject is the user's ID

		if (!user) {
			console.log("user is null");
			throw new ConvexError("Unauthorized");
		}

		const isPersonalSpaceAvailable = await ctx.runQuery(
			internal.collections.workspaces.queries.checkPersonalSpace,
			{
				externalId: user.externalId,
			},
		);

		if (!isPersonalSpaceAvailable) {
			throw new ConvexError(
				"You already have a personal workspace. Please upgrade to a team workspace to create more.",
			);
		}

		await ctx.db.insert("workspaces", {
			externalId: user.externalId,
			ownerId: user._id,
			workspaceType: "personal",
			title,
			color,
			icon,
			onboardingCompleted: false,
		});
	},
});
