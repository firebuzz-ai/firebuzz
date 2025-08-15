import { applyNodeChanges } from "@xyflow/react";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { mutationWithTrigger } from "../../triggers";
import { getCurrentUserWithWorkspace } from "../users/utils";
import {
	formFieldSchema,
	formNodeChangeValidator,
	formSchema,
	formViewportChangeValidator,
} from "./schema";

export const createInternal = internalMutation({
	args: formSchema.validator,
	handler: async (ctx, args) => {
		return await ctx.db.insert("forms", args);
	},
});

// Canvas-specific mutations (following campaign pattern)
export const updateFormNodes = mutationWithTrigger({
	args: {
		formId: v.id("forms"),
		changes: v.array(formNodeChangeValidator),
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get form
		const form = await ctx.db.get(args.formId);

		if (!form) {
			throw new ConvexError("Form not found");
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Filter out changes to pending nodes (optimistic updates)
		const validChanges = args.changes.filter((change) => {
			if ("id" in change && change.id.startsWith("pending-")) {
				console.warn("ignoring pending node change", { change });
				return false;
			}
			return true;
		});

		// Apply changes to current nodes
		const currentNodes = form.nodes || [];
		const updatedNodes = applyNodeChanges(validChanges, currentNodes);

		// Update form with new nodes (canvas is now the single source of truth)
		await ctx.db.patch(args.formId, {
			nodes: updatedNodes,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return updatedNodes;
	},
});

export const updateFormViewport = mutationWithTrigger({
	args: {
		formId: v.id("forms"),
		viewport: formViewportChangeValidator,
	},
	handler: async (ctx, args) => {
		// Check if user is authenticated
		const user = await getCurrentUserWithWorkspace(ctx);

		// Get form
		const form = await ctx.db.get(args.formId);

		if (!form) {
			throw new ConvexError("Form not found");
		}

		if (form.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Update form viewport
		await ctx.db.patch(args.formId, {
			viewport: args.viewport,
			updatedAt: new Date().toISOString(),
			lastSaved: new Date().toISOString(),
		});

		return args.viewport;
	},
});

export const updateSchemaInternal = internalMutation({
	args: {
		formId: v.id("forms"),
		schema: v.array(formFieldSchema),
		type: v.union(v.literal("preview"), v.literal("production")),
	},
	handler: async (ctx, args) => {
		const updateObject: Partial<Doc<"forms">> = {};

		if (args.type === "preview") {
			updateObject.previewSchema = args.schema;
		} else if (args.type === "production") {
			updateObject.productionSchema = args.schema;
		}

		return await ctx.db.patch(args.formId, updateObject);
	},
});
