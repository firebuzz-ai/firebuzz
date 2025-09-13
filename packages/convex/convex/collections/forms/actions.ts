import { ConvexError, v } from "convex/values";
import { internal } from "../../../src";
import { internalAction } from "../../_generated/server";
import { engineAPIClient } from "../../lib/engine";
import { ERRORS } from "../../utils/errors";

export const storeFormConfigInKV = internalAction({
  args: {
    id: v.id("forms"),
    type: v.union(v.literal("preview"), v.literal("production")),
  },
  handler: async (ctx, { id, type }) => {
    const form = await ctx.runQuery(
      internal.collections.forms.queries.getByIdInternal,
      { id }
    );

    if (!form) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Get campaign from campaignId
    const campaign = await ctx.runQuery(
      internal.collections.campaigns.queries.getByIdInternal,
      { id: form.campaignId }
    );

    if (!campaign) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Get schema from canvas nodes
    const formNode = form.nodes?.find(
      (node) => node.type === "form" && node.data
    );
    const schema = formNode?.data?.schema || [];

    const config = {
      campaignId: form.campaignId,
      schema: schema,
      privacyPolicyUrl: campaign.campaignSettings?.gdpr?.privacyPolicyUrl,
      termsOfServiceUrl: campaign.campaignSettings?.gdpr?.termsOfServiceUrl,
    };

    try {
      // Store the Config in KV
      await engineAPIClient.kv.campaign.$post({
        json: {
          key: `form:${type}:${form._id}`,
          value: JSON.stringify(config),
          options: {
            metadata: {},
          },
        },
      });

      // Update the schema in the database
      await ctx.runMutation(
        internal.collections.forms.mutations.updateSchemaInternal,
        {
          formId: form._id,
          schema: schema,
          type,
        }
      );
    } catch (error) {
      console.error(error);
      throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
    }
  },
});
