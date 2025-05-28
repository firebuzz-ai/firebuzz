import { asyncMap } from "convex-helpers";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { mutation } from "../../../_generated/server";
import { mutationWithTrigger } from "../../../triggers";
import { getCurrentUser } from "../../users/utils";

export const create = mutationWithTrigger({
	args: {
		name: v.string(),
		avatar: v.optional(v.string()),
		title: v.optional(v.string()),
		content: v.string(),
		rating: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		// Get Brand
		const brand = await ctx.db
			.query("brands")
			.withIndex("by_project_id", (q) => q.eq("projectId", projectId))
			.first();

		if (!brand) {
			throw new ConvexError("Brand not found");
		}

		const testimonial = await ctx.db.insert("testimonials", {
			name: args.name,
			avatar: args.avatar,
			title: args.title,
			content: args.content,
			rating: args.rating,
			workspaceId,
			projectId,
			brandId: brand._id,
			createdBy: user._id,
			searchContent: `${args.name} /n/n ${args.title} /n/n ${args.content} /n/n Rating:${args.rating}`,
		});

		return testimonial;
	},
});

export const update = mutation({
	args: {
		id: v.id("testimonials"),
		name: v.optional(v.string()),
		avatar: v.optional(v.string()),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		rating: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const testimonial = await ctx.db.get(args.id);

		if (!testimonial) {
			throw new ConvexError("Testimonial not found");
		}

		if (testimonial.projectId !== projectId) {
			throw new ConvexError("Unauthorized");
		}

		const updateObject: Partial<Doc<"testimonials">> = {
			updatedBy: user._id,
			updatedAt: new Date().toISOString(),
		};

		if (args.name) {
			updateObject.name = args.name;
			updateObject.searchContent = `${args.name} /n/n ${args.title ?? testimonial.title} /n/n ${args.content ?? testimonial.content} /n/n Rating:${args.rating ?? testimonial.rating}`;
		}

		if (args.title) {
			updateObject.title = args.title;
			updateObject.searchContent = `${args.name ?? testimonial.name} /n/n ${args.title} /n/n ${args.content ?? testimonial.content} /n/n Rating:${args.rating ?? testimonial.rating}`;
		}

		if (args.content) {
			updateObject.content = args.content;
			updateObject.searchContent = `${args.name ?? testimonial.name} /n/n ${args.title ?? testimonial.title} /n/n ${args.content} /n/n Rating:${args.rating ?? testimonial.rating}`;
		}

		if (args.rating) {
			updateObject.rating = args.rating;
			updateObject.searchContent = `${args.name ?? testimonial.name} /n/n ${args.title ?? testimonial.title} /n/n ${args.content ?? testimonial.content} /n/n Rating:${args.rating}`;
		}

		if (args.avatar) {
			updateObject.avatar = args.avatar;
		}

		const updatedAudience = await ctx.db.patch(args.id, updateObject);

		return updatedAudience;
	},
});

export const duplicate = mutationWithTrigger({
	args: {
		id: v.id("testimonials"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const testimonial = await ctx.db.get(args.id);

		if (!testimonial) {
			throw new ConvexError("Testimonial not found");
		}

		const duplicateTestimonial = await ctx.db.insert("testimonials", {
			name: `${testimonial.name} (Copy)`,
			avatar: testimonial.avatar,
			title: testimonial.title,
			content: testimonial.content,
			rating: testimonial.rating,
			workspaceId,
			projectId,
			brandId: testimonial.brandId,
			createdBy: user._id,
			searchContent: testimonial.searchContent,
		});

		return duplicateTestimonial;
	},
});

export const duplicateMany = mutationWithTrigger({
	args: {
		ids: v.array(v.id("testimonials")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const audiences = await asyncMap(args.ids, async (id) => {
			const audience = await ctx.db.get(id);
			if (!audience) {
				throw new ConvexError("Audience not found");
			}
			return audience;
		});

		if (audiences.some((audience) => audience.projectId !== projectId)) {
			throw new ConvexError("Unauthorized");
		}

		await asyncMap(audiences, async (audience) => {
			await ctx.db.insert("testimonials", {
				name: `${audience.name} (Copy)`,
				avatar: audience.avatar,
				title: audience.title,
				content: audience.content,
				rating: audience.rating,
				workspaceId,
				projectId,
				brandId: audience.brandId,
				createdBy: user._id,
				searchContent: audience.searchContent,
			});
		});

		return { success: true };
	},
});

export const deletePermanent = mutationWithTrigger({
	args: {
		id: v.id("testimonials"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const testimonial = await ctx.db.get(args.id);

		if (!testimonial) {
			throw new ConvexError("Testimonial not found");
		}

		if (testimonial.projectId !== projectId) {
			throw new ConvexError("Unauthorized");
		}

		await ctx.db.delete(args.id);

		return { success: true };
	},
});

export const deletePermanentMany = mutationWithTrigger({
	args: {
		ids: v.array(v.id("testimonials")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		const projectId = user?.currentProject;
		const workspaceId = user?.currentWorkspaceId;

		if (!user || !workspaceId || !projectId) {
			throw new ConvexError("Unauthorized");
		}

		const testimonials = await asyncMap(args.ids, async (id) => {
			const testimonial = await ctx.db.get(id);
			if (!testimonial) {
				throw new ConvexError("Testimonial not found");
			}
			return testimonial;
		});

		if (
			testimonials.some((testimonial) => testimonial.projectId !== projectId)
		) {
			throw new ConvexError("Unauthorized");
		}

		await asyncMap(testimonials, async (testimonial) => {
			await ctx.db.delete(testimonial._id);
		});

		return { success: true };
	},
});
