import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import type { DataModel, Id } from "../_generated/dataModel";

// Credits - redesigned to handle expiration and remaining balance correctly
export const aggregateCreditsBalance = new TableAggregate<{
	Namespace: Id<"workspaces">;
	Key: [string, number]; // [expiresAt or far future, _creationTime]
	DataModel: DataModel;
	TableName: "transactions";
}>(components.aggregateCredits, {
	namespace: (doc) => doc.workspaceId,
	// Sort by expiration date (with never-expiring credits at the end)
	sortKey: (doc) => [doc.expiresAt || "9999-12-31", doc._creationTime],
	sumValue: (doc) =>
		["adjustment", "refund", "usage"].includes(doc.type)
			? -doc.amount
			: doc.amount,
});

// Current Period Usage - aggregates usage (negative amounts) by expiration date only
export const aggregateCurrentPeriodUsage = new TableAggregate<{
	Namespace: Id<"workspaces">;
	Key: [string, number]; // [expiresAt, _creationTime]
	DataModel: DataModel;
	TableName: "transactions";
}>(components.aggregateCurrentPeriodUsage, {
	namespace: (doc) => doc.workspaceId,
	// Sort by expiration date, then creation time
	sortKey: (doc) => [doc.expiresAt, doc._creationTime],
	// Only sum negative amounts (usage)
	sumValue: (doc) => (doc.type === "usage" ? doc.amount : 0),
});

// Current Period Additions By Expiration - aggregates credit additions by expiration date only
export const aggregateCurrentPeriodAdditions = new TableAggregate<{
	Namespace: Id<"workspaces">;
	Key: [string, number]; // [expiresAt, _creationTime]
	DataModel: DataModel;
	TableName: "transactions";
}>(components.aggregateCurrentPeriodAdditions, {
	namespace: (doc) => doc.workspaceId,
	// Sort by expiration date, then creation time
	sortKey: (doc) => [doc.expiresAt, doc._creationTime],
	// Only sum positive amounts (additions)
	sumValue: (doc) =>
		["subscription", "topup", "gift", "trial"].includes(doc.type)
			? doc.amount
			: 0,
});

// Campaigns
export const aggregateCampaigns = new TableAggregate<{
	Namespace: Id<"projects">;
	Key: string;
	DataModel: DataModel;
	TableName: "campaigns";
}>(components.aggregateCampaigns, {
	namespace: (doc) => doc.projectId,
	sortKey: (doc) => doc._id,
});

// Landing Pages
export const aggregateLandingPages = new TableAggregate<{
	Namespace: Id<"projects">;
	Key: string;
	DataModel: DataModel;
	TableName: "landingPages";
}>(components.aggregateLandingPages, {
	namespace: (doc) => doc.projectId,
	sortKey: (doc) => doc._id,
});

// Landing Page Versions
export const aggregateLandingPageVersions = new TableAggregate<{
	Namespace: Id<"landingPages">;
	Key: string;
	DataModel: DataModel;
	TableName: "landingPageVersions";
}>(components.aggregateLandingPageVersions, {
	namespace: (doc) => doc.landingPageId,
	sortKey: (doc) => doc._id,
});

// Landing Page Templates
export const aggregateLandingPageTemplates = new TableAggregate<{
	Key: string;
	DataModel: DataModel;
	TableName: "landingPageTemplates";
}>(components.aggregateLandingPageTemplates, {
	sortKey: (doc) => doc._id,
});

// Media
export const aggregateMedia = new TableAggregate<{
	Namespace: Id<"projects">;
	Key: string;
	DataModel: DataModel;
	TableName: "media";
}>(components.aggregateMedia, {
	namespace: (doc) => doc.projectId,
	sortKey: (doc) => doc._id,
	sumValue: (doc) => doc.size,
});

// Documents
export const aggregateDocuments = new TableAggregate<{
	Namespace: Id<"projects">;
	Key: string;
	DataModel: DataModel;
	TableName: "documents";
}>(components.aggregateDocuments, {
	namespace: (doc) => doc.projectId,
	sortKey: (doc) => doc._id,
	sumValue: (doc) => doc.size,
});

// Memoized Documents
export const aggregateMemoizedDocuments = new TableAggregate<{
	Namespace: Id<"knowledgeBases">;
	Key: string;
	DataModel: DataModel;
	TableName: "memoizedDocuments";
}>(components.aggregateMemoizedDocuments, {
	namespace: (doc) => doc.knowledgeBaseId,
	sortKey: (doc) => doc._id,
});

// Testimonials
export const aggregateTestimonials = new TableAggregate<{
	Namespace: Id<"brands">;
	Key: string;
	DataModel: DataModel;
	TableName: "testimonials";
}>(components.aggregateTestimonials, {
	namespace: (doc) => doc.brandId,
	sortKey: (doc) => doc._id,
});
