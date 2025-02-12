import {
	customCtx,
	customMutation,
} from "convex-helpers/server/customFunctions";
import { internalMutation, mutation as rawMutation } from "./_generated/server";

import { asyncMap } from "convex-helpers";
import { getManyFrom } from "convex-helpers/server/relationships";
import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "./_generated/dataModel";

const triggers = new Triggers<DataModel>();

// Cascade delete all workspaces when a user is deleted
triggers.register("users", async (ctx, change) => {
	if (change.operation === "delete") {
		await asyncMap(
			await getManyFrom(ctx.db, "workspaces", "by_owner", change.id, "ownerId"),
			(workspace) => ctx.db.delete(workspace._id),
		);
	}
});

// Cascade delete all projects when a workspace is deleted
triggers.register("workspaces", async (ctx, change) => {
	if (change.operation === "delete") {
		await asyncMap(
			await getManyFrom(
				ctx.db,
				"projects",
				"by_workspace_id",
				change.id,
				"workspaceId",
			),
			(project) => ctx.db.delete(project._id),
		);
	}
});

// Use `mutation` to define all mutations, and the triggers will get called.
export const mutationWithTrigger = customMutation(
	rawMutation,
	customCtx(triggers.wrapDB),
);

export const internalMutationWithTrigger = customMutation(
	internalMutation,
	customCtx(triggers.wrapDB),
);
