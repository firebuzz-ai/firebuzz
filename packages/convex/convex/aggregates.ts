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
