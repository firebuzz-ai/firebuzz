"use client";

import type { Id } from "@firebuzz/convex";
import { FormRenderer } from "./form-renderer";

interface PreviewProps {
  campaignId: Id<"campaigns">;
}

export const Preview = ({ campaignId }: PreviewProps) => {
  return <FormRenderer campaignId={campaignId} />;
};
