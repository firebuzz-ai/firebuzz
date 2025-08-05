import { v } from "convex/values";

// Simplified React Flow Change validators - use v.any() for flexibility
// We'll validate the changes on the client side before sending to server
export const nodeChangeValidator = v.any();
export const edgeChangeValidator = v.any();

// Connection validator for new edge connections
export const connectionValidator = v.object({
  source: v.string(),
  target: v.string(),
  sourceHandle: v.optional(v.string()),
  targetHandle: v.optional(v.string()),
});

// Viewport change validator
export const viewportChangeValidator = v.object({
  x: v.number(),
  y: v.number(),
  zoom: v.number(),
});