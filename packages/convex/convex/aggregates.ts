import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";

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
