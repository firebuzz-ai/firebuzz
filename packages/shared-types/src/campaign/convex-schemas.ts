import { zodToConvex } from "convex-helpers/server/zod";
import { nodeSchema, edgeSchema, campaignSettingsSchema, eventSchema, viewportSchema } from "./schemas";

// Convert Zod schemas to Convex validators
export const nodeSchemaConvex = zodToConvex(nodeSchema);
export const edgeSchemaConvex = zodToConvex(edgeSchema);
export const campaignSettingsSchemaConvex = zodToConvex(campaignSettingsSchema);
export const eventSchemaConvex = zodToConvex(eventSchema);
export const viewportSchemaConvex = zodToConvex(viewportSchema);
