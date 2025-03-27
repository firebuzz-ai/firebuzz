import { ConvexError } from "convex/values";
import type { QueryCtx } from "../../_generated/server";
import { getWorkspaceByExternalId } from "../workspaces/utils";

export const getUserByExternalId = async (
	ctx: QueryCtx,
	externalId: string,
) => {
	return await ctx.db
		.query("users")
		.withIndex("by_external_id", (q) => q.eq("externalId", externalId))
		.unique();
};

export const getCurrentUser = async (ctx: QueryCtx) => {
	const clerkUser = await ctx.auth.getUserIdentity();

	if (!clerkUser) {
		throw new ConvexError("Unauthorized");
	}

	const user = await getUserByExternalId(ctx, clerkUser.subject); // clerkUser.subject is the user's ID

	if (!user) {
		throw new ConvexError("Unauthorized");
	}

	const currentWorkspace = await getWorkspaceByExternalId(
		ctx,
		(clerkUser.org_id ?? clerkUser.subject) as string,
	);

	if (!currentWorkspace) {
		throw new ConvexError("Unauthorized");
	}

	const userWithCurrentWorkspace = {
		...user,
		currentWorkspaceId: currentWorkspace?._id,
		currentWorkspaceExternalId: currentWorkspace?.externalId,
		currentRole: (clerkUser.org_role ?? "Admin") as "Admin" | "Member",
	};

	return userWithCurrentWorkspace;
};
