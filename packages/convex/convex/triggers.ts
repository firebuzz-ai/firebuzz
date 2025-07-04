import {
	customCtx,
	customMutation,
} from "convex-helpers/server/customFunctions";
import { internalMutation, mutation as rawMutation } from "./_generated/server";

import { asyncMap } from "convex-helpers";
import { getManyFrom } from "convex-helpers/server/relationships";
import { Triggers } from "convex-helpers/server/triggers";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import {
	aggregateCampaigns,
	aggregateCreditsBalance as aggregateCredits,
	aggregateCurrentPeriodAdditions,
	aggregateCurrentPeriodUsage,
	aggregateDocuments,
	aggregateLandingPageTemplates,
	aggregateLandingPageVersions,
	aggregateLandingPages,
	aggregateMedia,
	aggregateMemoizedDocuments,
	aggregateTestimonials,
} from "./components/aggregates";
import {
	batchDeleteStoragePool,
	cascadePool,
	vectorizationPool,
} from "./components/workpools";

const triggers = new Triggers<DataModel>();

// @CASCADE

// Cascade delete all workspaces when a user is deleted
triggers.register("users", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete all members associated with this user
		await ctx.runMutation(internal.collections.members.utils.deleteByUserId, {
			userId: change.id,
		});

		await asyncMap(
			await getManyFrom(
				ctx.db,
				"workspaces",
				"by_owner_id",
				change.id,
				"ownerId",
			),
			(workspace) =>
				ctx.runMutation(
					internal.collections.workspaces.mutations.deletePermanentInternal,
					{ id: workspace._id },
				),
		);
	}
});

// Cascade delete all projects and customer and onboarding data when a workspace is deleted
triggers.register("workspaces", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete Members
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.members.utils.batchDeleteByWorkspaceId,
			{
				workspaceId: change.id,
				numItems: 25,
			},
		);

		// Delete Invitations
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.invitations.utils.batchDeleteByWorkspaceId,
			{
				workspaceId: change.id,
				numItems: 25,
			},
		);

		// Delete Projects
		await asyncMap(
			await getManyFrom(
				ctx.db,
				"projects",
				"by_workspace_id",
				change.id,
				"workspaceId",
			),
			(project) =>
				ctx.runMutation(
					internal.collections.projects.mutations.deletePermanentInternal,
					{ id: project._id },
				),
		);

		// Delete Customer
		await ctx.runMutation(
			internal.collections.stripe.customers.mutations
				.deleteByWorkspaceIdInternal,
			{ workspaceId: change.id },
		);

		// Delete Onboarding
		await ctx.runMutation(
			internal.collections.onboarding.mutations.deleteByWorkspaceIdInternal,
			{ workspaceId: change.id },
		);
	}
});

// Cascade delete all campaigns and brands and media when a project is deleted
triggers.register("projects", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete campaigns
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.campaigns.utils.batchDelete,
			{
				projectId: change.id,
				numItems: 25,
			},
		);

		// Delete Media
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.media.utils.batchDelete,
			{
				projectId: change.id,
				numItems: 25,
			},
		);

		// Delete documents
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.documents.utils.batchDelete,
			{
				projectId: change.id,
				numItems: 25,
			},
		);

		// Delete knowledge bases
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.knowledgeBases.utils.batchDelete,
			{
				projectId: change.id,
				numItems: 25,
			},
		);

		// Delete brand
		await ctx.runMutation(
			internal.collections.brands.mutations.deletePermanentByProjectId,
			{
				projectId: change.id,
			},
		);

		// Delete onboarding
		await ctx.runMutation(
			internal.collections.onboarding.mutations.deleteByProjectIdInternal,
			{
				projectId: change.id,
			},
		);
	}
});

// Cascade delete all brand collections when a brand is deleted (audiences, features, socials, testimonials, themes)
triggers.register("brands", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete audiences
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.brands.audiences.utils.batchDelete,
			{
				brandId: change.id,
				numItems: 25,
			},
		);

		// Delete features
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.brands.features.utils.batchDelete,
			{
				brandId: change.id,
				numItems: 25,
			},
		);

		// Delete socials
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.brands.socials.utils.batchDelete,
			{
				brandId: change.id,
				numItems: 25,
			},
		);

		// Delete testimonials
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.brands.testimonials.utils.batchDelete,
			{
				brandId: change.id,
				numItems: 25,
			},
		);

		// Delete themes
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.brands.themes.utils.batchDelete,
			{
				brandId: change.id,
				numItems: 25,
			},
		);
	}
});

// Cascade delete all landing pages when a campaign is deleted
triggers.register("campaigns", async (ctx, change) => {
	if (change.operation === "delete") {
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.landingPages.utils.batchDelete,
			{
				campaignId: change.id,
				numItems: 50,
			},
		);
	}
});

// Cascade delete all landing page messages and versions when a landing page is deleted
triggers.register("landingPages", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete landing page messages
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.landingPages.messages.utils.batchDelete,
			{
				landingPageId: change.id,
				numItems: 50,
			},
		);
		// Delete landing page versions
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.landingPages.versions.utils.batchDelete,
			{
				landingPageId: change.id,
				numItems: 50,
			},
		);
	}
});

// Cascade delete all memoized documents when a knowledge base is deleted
triggers.register("knowledgeBases", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete the memoized documents
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.documents.memoized.utils
				.batchDeleteByKnowledgeBaseId,
			{
				knowledgeBaseId: change.id,
				numItems: 25,
			},
		);
	}
});

// Cascade delete all vectors when a memoized document is deleted
triggers.register("memoizedDocuments", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete the document vectors
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.documents.vectors.utils
				.batchDeleteByKnowledgeBaseId,
			{
				knowledgeBaseId: change.oldDoc.knowledgeBaseId,
				numItems: 25,
			},
		);
	}
});

// Cascade delete all media vectors and R2 files when a media is deleted
triggers.register("media", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete the media vectors
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.media.vectors.utils.batchDelete,
			{
				mediaId: change.id,
				numItems: 25,
			},
		);

		// Delete the R2 files
		await batchDeleteStoragePool.enqueueMutation(
			ctx,
			internal.components.r2.deletePermanent,
			{
				key: change.id,
			},
		);
	}
});

// Cascade delete all document (chunks & memoized & r2) when a document is deleted
triggers.register("documents", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete the document chunks
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.documents.chunks.utils.batchDelete,
			{
				documentId: change.id,
				numItems: 25,
			},
		);

		// Delete the memoized documents
		await cascadePool.enqueueMutation(
			ctx,
			internal.collections.storage.documents.memoized.utils
				.batchDeleteByDocumentId,
			{
				documentId: change.id,
				numItems: 25,
			},
		);

		// Delete files from R2
		await batchDeleteStoragePool.enqueueMutation(
			ctx,
			internal.components.r2.deletePermanent,
			{
				key: change.id,
			},
		);
	}
});

// Cascade delete all stripe related data when a customer is deleted
triggers.register("customers", async (ctx, change) => {
	if (change.operation === "delete") {
		// Delete all subscriptions
		await ctx.runMutation(
			internal.collections.stripe.subscriptions.mutations
				.deleteByCustomerIdInternal,
			{
				customerId: change.id,
			},
		);

		// Delete all payment methods
		await ctx.runMutation(
			internal.collections.stripe.paymentMethods.mutations
				.deleteByCustomerIdInternal,
			{
				customerId: change.id,
			},
		);

		// Delete all payments
		await ctx.runMutation(
			internal.collections.stripe.payments.mutations.deleteByCustomerIdInternal,
			{
				customerId: change.id,
			},
		);

		// Delete all transactions
		await ctx.runMutation(
			internal.collections.stripe.transactions.utils.batchDelete,
			{
				customerId: change.id,
				numItems: 25,
			},
		);
	}
});

// Cascade delete all subscription items when a subscription is deleted
triggers.register("subscriptions", async (ctx, change) => {
	if (change.operation === "delete") {
		await ctx.runMutation(
			internal.collections.stripe.subscriptionItems.mutations
				.deleteBySubscriptionIdInternal,
			{
				subscriptionId: change.id,
			},
		);
	}
});

// @AGGREGATE

// Campaigns Aggregate
triggers.register("campaigns", async (ctx, change) => {
	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateCampaigns.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;

		// If the campaign is being deleted, delete the aggregate
		if (!oldDoc.deletedAt && newDoc.deletedAt) {
			await aggregateCampaigns.deleteIfExists(ctx, oldDoc);
		}
		// If the campaign is being restored, insert the aggregate
		else if (oldDoc.deletedAt && !newDoc.deletedAt) {
			await aggregateCampaigns.insert(ctx, newDoc);
		} else {
			await aggregateCampaigns.replace(ctx, oldDoc, newDoc);
		}
	}
});

// Landing Pages Aggregate
triggers.register("landingPages", async (ctx, change) => {
	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateLandingPages.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;

		// If the landing page is being deleted, delete the aggregate
		if (!oldDoc.deletedAt && newDoc.deletedAt) {
			await aggregateLandingPages.deleteIfExists(ctx, oldDoc);
		}
		// If the landing page is being restored, insert the aggregate
		else if (oldDoc.deletedAt && !newDoc.deletedAt) {
			await aggregateLandingPages.insert(ctx, newDoc);
		} else {
			await aggregateLandingPages.replace(ctx, oldDoc, newDoc);
		}
	}
});

// Landing Page Versions Aggregate
triggers.register("landingPageVersions", async (ctx, change) => {
	if (change.operation === "delete") {
		const doc = change.oldDoc;
		await aggregateLandingPageVersions.deleteIfExists(ctx, doc);
	} else if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateLandingPageVersions.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;
		await aggregateLandingPageVersions.replace(ctx, oldDoc, newDoc);
	}
});

// Landing Page Templates Aggregate
triggers.register("landingPageTemplates", async (ctx, change) => {
	if (change.operation === "delete") {
		const doc = change.oldDoc;
		await aggregateLandingPageTemplates.deleteIfExists(ctx, doc);
	} else if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateLandingPageTemplates.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;
		await aggregateLandingPageTemplates.replace(ctx, oldDoc, newDoc);
	}
});

// Media Aggregate
triggers.register("media", async (ctx, change) => {
	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateMedia.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;

		// If the media is being deleted, delete the aggregate
		if (!oldDoc.deletedAt && newDoc.deletedAt) {
			await aggregateMedia.deleteIfExists(ctx, oldDoc);
		}

		// If the media is being restored, insert the aggregate
		else if (oldDoc.deletedAt && !newDoc.deletedAt) {
			await aggregateMedia.insert(ctx, newDoc);
		}

		// If the media is being updated, replace the aggregate
		else {
			await aggregateMedia.replace(ctx, oldDoc, newDoc);
		}
	}
});

// Documents Aggregate
triggers.register("documents", async (ctx, change) => {
	// If the document is a memory item, don't aggregate it
	if (change.newDoc?.isMemoryItem || change.oldDoc?.isMemoryItem) {
		return;
	}

	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateDocuments.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;

		// If the media is being deleted, delete the aggregate
		if (!oldDoc.deletedAt && newDoc.deletedAt) {
			await aggregateDocuments.deleteIfExists(ctx, oldDoc);
		}

		// If the media is being restored, insert the aggregate
		else if (oldDoc.deletedAt && !newDoc.deletedAt) {
			await aggregateDocuments.insert(ctx, newDoc);
		}

		// If the media is being updated, replace the aggregate
		else {
			await aggregateDocuments.replace(ctx, oldDoc, newDoc);
		}
	}
});

// Memoized Documents Aggregate
triggers.register("memoizedDocuments", async (ctx, change) => {
	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateMemoizedDocuments.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;
		await aggregateMemoizedDocuments.replace(ctx, oldDoc, newDoc);
	} else if (change.operation === "delete") {
		const doc = change.oldDoc;
		await aggregateMemoizedDocuments.deleteIfExists(ctx, doc);
	}
});

// Testimonials Aggregate
triggers.register("testimonials", async (ctx, change) => {
	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateTestimonials.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;
		await aggregateTestimonials.replace(ctx, oldDoc, newDoc);
	} else if (change.operation === "delete") {
		const doc = change.oldDoc;
		await aggregateTestimonials.deleteIfExists(ctx, doc);
	}
});

// Transactions Aggregate
triggers.register("transactions", async (ctx, change) => {
	if (change.operation === "insert") {
		const doc = change.newDoc;
		await aggregateCredits.insert(ctx, doc);
		await aggregateCurrentPeriodUsage.insert(ctx, doc);
		await aggregateCurrentPeriodAdditions.insert(ctx, doc);
	} else if (change.operation === "update") {
		const newDoc = change.newDoc;
		const oldDoc = change.oldDoc;
		await aggregateCredits.replace(ctx, oldDoc, newDoc);
		await aggregateCurrentPeriodUsage.replace(ctx, oldDoc, newDoc);
		await aggregateCurrentPeriodAdditions.replace(ctx, oldDoc, newDoc);
	} else if (change.operation === "delete") {
		const doc = change.oldDoc;
		await aggregateCredits.deleteIfExists(ctx, doc);
		await aggregateCurrentPeriodUsage.deleteIfExists(ctx, doc);
		await aggregateCurrentPeriodAdditions.deleteIfExists(ctx, doc);
	}
});

// @CHUNKING

// Chunk Document
triggers.register("documents", async (ctx, change) => {
	if (change.operation === "insert" && !change.newDoc.isMemoryItem) {
		await ctx.scheduler.runAfter(
			0,
			internal.collections.storage.documents.chunks.actions.chunkDocument,
			{
				documentId: change.newDoc._id,
				name: change.newDoc.name,
				key: change.newDoc.key,
				type: change.newDoc.type,
				workspaceId: change.newDoc.workspaceId,
				projectId: change.newDoc.projectId,
			},
		);
	}
});

// @VECTORIZATION

// Media Vectorization
triggers.register("media", async (ctx, change) => {
	// Insert
	if (change.operation === "insert") {
		const doc = change.newDoc;
		if (
			doc.type === "image" &&
			["png", "jpg", "jpeg", "webp"].includes(doc.contentType.split("/")[1])
		) {
			await vectorizationPool.enqueueAction(
				ctx,
				internal.collections.storage.media.vectors.actions.vectorize,
				{
					mediaId: doc._id,
					mediaKey: doc.key,
					projectId: doc.projectId,
					workspaceId: doc.workspaceId,
				},
			);
		}
	}
});

// Document Vectorization
triggers.register("documents", async (ctx, change) => {
	if (change.operation === "update") {
		const doc = change.newDoc;
		const oldDoc = change.oldDoc;
		if (
			doc.chunkingStatus === "chunked" &&
			oldDoc.chunkingStatus !== "chunked" &&
			doc.knowledgeBases &&
			doc.knowledgeBases.length > 0
		) {
			await vectorizationPool.enqueueAction(
				ctx,
				internal.collections.storage.documents.vectors.actions.vectorize,
				{
					documentId: doc._id,
					projectId: doc.projectId,
					workspaceId: doc.workspaceId,
					knowledgeBases: doc.knowledgeBases,
				},
			);
		}
	}
});

export const mutationWithTrigger = customMutation(
	rawMutation,
	customCtx(triggers.wrapDB),
);

export const internalMutationWithTrigger = customMutation(
	internalMutation,
	customCtx(triggers.wrapDB),
);
