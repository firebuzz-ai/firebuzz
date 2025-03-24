import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { aggregateLandingPageVersions } from "../../aggregates";
import { retrier } from "../../helpers/retrier";

export const createLandingPageVersionInternal = async (
  ctx: MutationCtx,
  {
    userId,
    workspaceId,
    projectId,
    campaignId,
    landingPageId,
    filesString,
    messageId,
  }: {
    userId: Id<"users">;
    landingPageId: Id<"landingPages">;
    workspaceId: Id<"workspaces">;
    projectId: Id<"projects">;
    campaignId: Id<"campaigns">;
    filesString: string;
    messageId: string | undefined;
  }
) => {
  // Check last count of landing page versions
  const lastCount = await aggregateLandingPageVersions.count(ctx, {
    namespace: landingPageId,
    // @ts-ignore
    bounds: {},
  });

  const key = `landing-page-versions/${landingPageId}/${crypto.randomUUID()}.txt`;

  // Create the landing page version
  const landingPageVersion = await ctx.db.insert("landingPageVersions", {
    number: lastCount + 1,
    createdBy: userId,
    workspaceId: workspaceId,
    projectId: projectId,
    campaignId: campaignId,
    landingPageId: landingPageId,
    messageId: messageId,
    key: key,
  });

  // Store the files in R2
  await retrier.run(
    ctx,
    internal.collections.landingPageVersions.actions.storeLandingPageVersion,
    {
      key,
      filesString: filesString,
      metadata: {
        landingPageId: landingPageId,
        landingPageVersionId: landingPageVersion,
        workspaceId: workspaceId,
        projectId: projectId,
        campaignId: campaignId,
      },
    }
  );

  // Update the landing page version
  await ctx.db.patch(landingPageId, {
    landingPageVersionId: landingPageVersion,
  });

  return {
    landingPageVersionId: landingPageVersion,
    number: lastCount + 1,
  };
};
