import { ConvexError, v } from "convex/values";
import { internal } from "../../../../src";
import { internalAction } from "../../../_generated/server";
import { engineAPIClient } from "../../../lib/engine";

export const storeConfigInKV = internalAction({
  args: {
    projectDomainId: v.id("projectDomains"),
  },
  handler: async (ctx, args) => {
    const projectDomain = await ctx.runQuery(
      internal.collections.domains.project.queries.getByIdInternal,
      {
        id: args.projectDomainId,
      }
    );

    if (!projectDomain) {
      throw new ConvexError("Project domain not found");
    }

    const key = `${projectDomain.subdomain}.${projectDomain.domain}`;

    // Store the Config in KV
    try {
      await engineAPIClient.kv.domain.$post({
        json: {
          key,
          value: JSON.stringify({
            w: projectDomain.workspaceId,
            p: projectDomain.projectId,
            e: process.env.ENVIRONMENT,
            t: "p",
          }),
          options: {
            metadata: {},
          },
        },
      });
    } catch (error) {
      console.error(error);
      throw new ConvexError("Failed to store config in KV");
    }
  },
});
