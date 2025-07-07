import { defineSchema, defineTable } from "convex/server";
import { campaignSchema } from "./collections/campaigns/schema";
import { landingPageMessagesSchema } from "./collections/landingPages/messages/schema";
import { landingPagesSchema } from "./collections/landingPages/schema";
import { landingPageTemplatesSchema } from "./collections/landingPages/templates/schema";
import { landingPageVersionsSchema } from "./collections/landingPages/versions/schema";
import { projectSchema } from "./collections/projects/schema";
import { documentChunksSchema } from "./collections/storage/documents/chunks/schema";
import { documentsSchema } from "./collections/storage/documents/schema";

import { audienceSchema } from "./collections/brands/audiences/schema";
import { featureSchema } from "./collections/brands/features/schema";
import { brandSchema } from "./collections/brands/schema";
import { socialSchema } from "./collections/brands/socials/schema";
import { testimonialSchema } from "./collections/brands/testimonials/schema";
import { themeSchema } from "./collections/brands/themes/schema";
import { domainSchema } from "./collections/domains/schema";
import { invitationSchema } from "./collections/invitations/schema";
import { memberSchema } from "./collections/members/schema";
import { onboardingSchema } from "./collections/onboarding/schema";
import { memoizedDocumentsSchema } from "./collections/storage/documents/memoized/schema";
import { documentVectorsSchema } from "./collections/storage/documents/vectors/schema";
import { knowledgeBaseSchema } from "./collections/storage/knowledgeBases/schema";
import { mediaSchema } from "./collections/storage/media/schema";
import { mediaVectorsSchema } from "./collections/storage/media/vectors/schema";
import { customerSchema } from "./collections/stripe/customers/schema";
import { invoiceSchema } from "./collections/stripe/invoices/schema";
import { paymentMethodSchema } from "./collections/stripe/paymentMethods/schema";
import { paymentSchema } from "./collections/stripe/payments/schema";
import { priceSchema } from "./collections/stripe/prices/schema";
import { productSchema } from "./collections/stripe/products/schema";
import { subscriptionItemSchema } from "./collections/stripe/subscriptionItems/schema";
import { subscriptionSchema } from "./collections/stripe/subscriptions/schema";
import { transactionSchema } from "./collections/stripe/transactions/schema";
import { webhookEventSchema } from "./collections/stripe/webhookEvents/schema";
import { userSchema } from "./collections/users/schema";
import { workspaceSchema } from "./collections/workspaces/schema";

export default defineSchema({
  users: defineTable(userSchema).index("by_external_id", ["externalId"]),
  workspaces: defineTable(workspaceSchema)
    .index("by_external_id", ["externalId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_stripe_customer_id", ["customerId"])
    .index("by_slug", ["slug"]),
  projects: defineTable(projectSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_title", ["title"]),
  onboarding: defineTable(onboardingSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"]),
  campaigns: defineTable(campaignSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_deleted_at", ["deletedAt"])
    .index("by_slug_project_id", ["slug", "projectId"])
    .searchIndex("by_title", { searchField: "title" }),
  landingPageTemplates: defineTable(landingPageTemplatesSchema).index(
    "by_title",
    ["title"]
  ),
  landingPages: defineTable(landingPagesSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .index("by_deleted_at", ["deletedAt"])
    .searchIndex("by_title", { searchField: "title" }),
  landingPageVersions: defineTable(landingPageVersionsSchema)
    .index("by_landing_page_id", ["landingPageId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .index("by_message_id", ["messageId"]),
  landingPageMessages: defineTable(landingPageMessagesSchema)
    .index("by_landing_page_id", ["landingPageId"])
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_campaign_id", ["campaignId"])
    .index("by_created_at", ["createdAt"])
    .index("by_message_id", ["messageId"]),
  media: defineTable(mediaSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_created_by", ["createdBy"])
    .index("by_deleted_at", ["deletedAt"])
    .searchIndex("by_fileName", { searchField: "name" }),
  mediaVectors: defineTable(mediaVectorsSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_media_id", ["mediaId"])
    .vectorIndex("by_emmbedings", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["projectId"],
    }),
  domains: defineTable(domainSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_workspace_hostname", ["workspaceId", "hostname"])
    .index("by_status", ["status"])
    .index("by_cloudflare_hostname_id", ["cloudflareHostnameId"])
    .index("by_deleted_at", ["deletedAt"])
    .searchIndex("by_hostname", { searchField: "hostname" }),
  documents: defineTable(documentsSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_created_by", ["createdBy"])
    .index("by_deleted_at", ["deletedAt"])
    .index("by_key", ["key"])
    .index("by_knowledge_base", ["knowledgeBases"])
    .searchIndex("by_fileName", { searchField: "name" }),
  documentChunks: defineTable(documentChunksSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_document_id", ["documentId"]),
  documentVectors: defineTable(documentVectorsSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_document_id", ["documentId"])
    .index("by_chunk_id", ["chunkId"])
    .index("by_knowledge_base_id", ["knowledgeBaseId"])
    .vectorIndex("by_emmbedings", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["projectId", "knowledgeBaseId", "documentId"],
    }),
  knowledgeBases: defineTable(knowledgeBaseSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_created_by", ["createdBy"]),
  brands: defineTable(brandSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"]),
  themes: defineTable(themeSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_brand_id", ["brandId"]),
  audiences: defineTable(audienceSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_brand_id", ["brandId"])
    .searchIndex("by_name", { searchField: "name" }),
  features: defineTable(featureSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_brand_id", ["brandId"]),
  testimonials: defineTable(testimonialSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_brand_id", ["brandId"])
    .searchIndex("by_search_content", { searchField: "searchContent" }),
  socials: defineTable(socialSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_project_id", ["projectId"])
    .index("by_brand_id", ["brandId"])
    .searchIndex("by_platform", { searchField: "platform" }),

  // Stripe Tables
  transactions: defineTable(transactionSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_customer_id", ["customerId"])
    .index("by_workspace_period", ["workspaceId", "periodStart"])
    .index("by_subscription_id", ["subscriptionId"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_type_expires", ["type", "expiresAt"]),
  customers: defineTable(customerSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),
  subscriptions: defineTable(subscriptionSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_customer_id", ["customerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),
  subscriptionItems: defineTable(subscriptionItemSchema)
    .index("by_subscription_id", ["subscriptionId"])
    .index("by_stripe_subscription_item_id", ["stripeSubscriptionItemId"]),
  invoices: defineTable(invoiceSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_customer_id", ["customerId"])
    .index("by_subscription_id", ["subscriptionId"])
    .index("by_stripe_invoice_id", ["stripeInvoiceId"]),
  paymentMethods: defineTable(paymentMethodSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_customer_id", ["customerId"])
    .index("by_stripe_payment_method_id", ["stripePaymentMethodId"]),
  payments: defineTable(paymentSchema)
    .index("by_customer_id", ["customerId"])
    .index("by_invoice_id", ["invoiceId"])
    .index("by_stripe_payment_intent_id", ["stripePaymentIntentId"]),
  products: defineTable(productSchema).index("by_stripe_product_id", [
    "stripeProductId",
  ]),
  prices: defineTable(priceSchema)
    .index("by_product_id", ["productId"])
    .index("by_stripe_price_id", ["stripePriceId"]),
  webhookEvents: defineTable(webhookEventSchema).index("by_stripe_event_id", [
    "stripeEventId",
  ]),
  invitations: defineTable(invitationSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_external_id", ["externalId"]),
  members: defineTable(memberSchema)
    .index("by_workspace_id", ["workspaceId"])
    .index("by_user_id", ["userId"])
    .index("by_external_user_id", ["userExternalId"])
    .index("by_external_id", ["externalId"])
    .index("by_user_id_workspace_id", ["userId", "workspaceId"]),

  // Helper Tables
  memoizedDocuments: defineTable(memoizedDocumentsSchema)
    .index("by_knowledge_base", ["knowledgeBaseId"])
    .index("by_document_id", ["documentId"])
    .index("by_document_id_knowledge_base", ["documentId", "knowledgeBaseId"]),
});
