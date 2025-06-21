import { v } from "convex/values";

export const domainSchema = v.object({
  // Domain information
  hostname: v.string(),
  cloudflareHostnameId: v.string(), // ID from Cloudflare API

  // SSL/Certificate information
  sslExpiresAt: v.optional(v.string()), // ISO 8601
  sslStatus: v.union(
    v.literal("initializing"),
    v.literal("pending_validation"),
    v.literal("deleted"),
    v.literal("pending_issuance"),
    v.literal("pending_deployment"),
    v.literal("pending_deletion"),
    v.literal("pending_expiration"),
    v.literal("expired"),
    v.literal("active"),
    v.literal("initializing_timed_out"),
    v.literal("validation_timed_out"),
    v.literal("issuance_timed_out"),
    v.literal("deployment_timed_out"),
    v.literal("deletion_timed_out"),
    v.literal("pending_cleanup"),
    v.literal("staging_deployment"),
    v.literal("staging_active"),
    v.literal("deactivating"),
    v.literal("inactive"),
    v.literal("backup_issued"),
    v.literal("holding_deployment")
  ),

  // Verification records for domain setup
  verificationRecord: v.array(
    v.object({
      name: v.string(),
      type: v.union(v.literal("cname"), v.literal("txt")),
      value: v.string(),
    })
  ),

  // Status and metadata
  status: v.union(
    v.literal("active"),
    v.literal("pending"),
    v.literal("active_redeploying"),
    v.literal("moved"),
    v.literal("pending_deletion"),
    v.literal("deleted"),
    v.literal("pending_blocked"),
    v.literal("pending_migration"),
    v.literal("pending_provisioned"),
    v.literal("test_pending"),
    v.literal("test_active"),
    v.literal("test_active_apex"),
    v.literal("test_blocked"),
    v.literal("test_failed"),
    v.literal("provisioned"),
    v.literal("blocked")
  ),
  lastCheckedAt: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.string())),

  // Relations
  workspaceId: v.id("workspaces"),
  projectId: v.id("projects"),
  createdBy: v.id("users"),

  // Soft delete and archiving
  isArchived: v.optional(v.boolean()),
  deletedAt: v.optional(v.string()),
});
