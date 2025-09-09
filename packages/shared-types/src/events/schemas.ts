import { z } from "zod";

// Base event schema matching events_v1.datasource
export const eventDataSchema = z.object({
  timestamp: z.string().datetime(),
  id: z.string(),
  event_id: z.string(),
  event_value: z.number(),
  event_value_currency: z.string().default("USD"),
  event_value_type: z.enum(["dynamic", "static"]),
  event_type: z.enum(["conversion", "engagement", "system"]),
  event_placement: z.enum(["internal", "external"]),

  // Context IDs for joining (no geo/device data - stored in session_v1)
  user_id: z.string(),
  campaign_id: z.string(),
  session_id: z.string(),
  workspace_id: z.string(),
  project_id: z.string(),
  landing_page_id: z.string(),
  ab_test_id: z.string().nullable().optional(),
  ab_test_variant_id: z.string().nullable().optional(),

  // Event-specific metrics
  form_id: z.string().nullable().optional(),
  clicked_element: z.string().nullable().optional(),
  clicked_url: z.string().nullable().optional(),
  page_load_time: z.number().nullable().optional(),
  dom_ready_time: z.number().nullable().optional(),
  scroll_percentage: z.number().int().min(0).max(100).nullable().optional(),
  time_on_page: z.number().int().min(0).nullable().optional(),
  session_event_sequence: z.number().int().min(1), // Managed by DO
  viewport_width: z.number().int().min(0).nullable().optional(),
  viewport_height: z.number().int().min(0).nullable().optional(),

  // Custom event data
  metadata: z.string().nullable().optional(),

  // Environment
  environment: z.string(),
  campaign_environment: z.string(),
  page_url: z.string(),
  referrer_url: z.string().nullable().optional(),
});

// Client event tracking request (minimal data sent from client)
export const trackEventRequestSchema = z.object({
  session_id: z.string(),
  event_id: z.string(),
  event_type: z.enum(["conversion", "engagement", "system"]),
  event_value: z.number().optional(),
  event_value_currency: z.string().default("USD").optional(),
  event_value_type: z.enum(["dynamic", "static"]).optional(),

  // Optional event-specific data
  form_id: z.string().optional(),
  clicked_element: z.string().optional(),
  clicked_url: z.string().optional(),
  page_load_time: z.number().optional(),
  dom_ready_time: z.number().optional(),
  scroll_percentage: z.number().int().min(0).max(100).optional(),
  time_on_page: z.number().int().min(0).optional(),
  viewport_width: z.number().int().min(0).optional(),
  viewport_height: z.number().int().min(0).optional(),
  metadata: z.string().optional(),
  page_url: z.string().optional(),
  referrer_url: z.string().optional(),
});

// Session initialization request
export const initSessionRequestSchema = z.object({
  session_id: z.string(),
  campaign_id: z.string(),
  workspace_id: z.string(),
  project_id: z.string(),
  landing_page_id: z.string(),
  user_id: z.string(), // Required for init - server ensures these exist on page load
  ab_test_id: z.string().optional(),
  ab_test_variant_id: z.string().optional(),
  session_timeout_minutes: z.number().int().min(5).max(30).default(30),
  environment: z.string().optional(),
  campaign_environment: z.string().optional(),
});

// DO Session State schema
export const doSessionStateSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  campaignId: z.string(),
  workspaceId: z.string(),
  projectId: z.string(),
  attributionId: z.string(),
  landingPageId: z.string(),
  abTestId: z.string().nullable().optional(),
  abTestVariantId: z.string().nullable().optional(),

  // DO management
  eventBuffer: z.array(eventDataSchema).default([]),
  eventSequence: z.number().int().min(0).default(0),
  lastActivity: z.number().int(),
  sessionTimeout: z.number().int().min(5).max(30),
  createdAt: z.number().int(),
  isExpired: z.boolean().default(false),

  // Environment
  environment: z.string(),
  campaignEnvironment: z.string(),
});

// Session validation response
export const sessionValidationResponseSchema = z.object({
  valid: z.boolean(),
  session: doSessionStateSchema.optional(),
  reason: z.enum(["valid", "expired", "not_found"]).optional(),
  new_session_id: z.string().optional(),
});

// External event tracking request (from track.js)
export const externalTrackEventRequestSchema = z.object({
  click_id: z.string(),
  event_id: z.string(),
  event_value: z.number().default(0),
  event_value_currency: z.string().default("USD"),
  event_value_type: z.enum(["dynamic", "static"]).default("dynamic"),
  // Additional context data from external website
  page_url: z.string().optional(),
  referrer_url: z.string().nullable().optional(),
  viewport_width: z.number().nullable().optional(),
  viewport_height: z.number().nullable().optional(),
});

// Batch event processing for Tinybird
export const eventBatchSchema = z.object({
  events: z.array(eventDataSchema),
  total_events: z.number().int().min(0),
  session_id: z.string(),
});
