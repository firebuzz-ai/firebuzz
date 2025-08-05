import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import { formSchema } from "./schema";

export const createInternal = internalMutation({
	args: formSchema.validator,
	handler: async (ctx, args) => {
		return await ctx.db.insert("forms", args);
	},
});

export const update = mutation({
	args: {
		id: v.id("forms"),
		schema: formSchema.validator.fields.schema,
		submitButtonText: v.optional(v.string()),
		successMessage: v.optional(v.string()),
		successRedirectUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const updateFields: Partial<Doc<"forms">> = {
			schema: args.schema,
			updatedAt: new Date().toISOString(),
		};

		if (args.submitButtonText !== undefined) {
			updateFields.submitButtonText = args.submitButtonText;
		}

		if (args.successMessage !== undefined) {
			updateFields.successMessage = args.successMessage;
		}

		if (args.successRedirectUrl !== undefined) {
			updateFields.successRedirectUrl = args.successRedirectUrl;
		}

		return await ctx.db.patch(args.id, updateFields);
	},
});

export const updateFormSettings = mutation({
	args: {
		id: v.id("forms"),
		submitButtonText: v.optional(v.string()),
		successMessage: v.optional(v.string()),
		successRedirectUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { id, ...updateFields } = args;

		// Add updatedAt timestamp
		const fieldsToUpdate = {
			...updateFields,
			updatedAt: new Date().toISOString(),
		};

		return await ctx.db.patch(id, fieldsToUpdate);
	},
});
