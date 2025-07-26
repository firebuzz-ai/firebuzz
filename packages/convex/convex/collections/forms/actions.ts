import { ConvexError, v } from "convex/values";
import { internal } from "../../../src";
import { internalAction } from "../../_generated/server";
import { engineAPIClient } from "../../lib/engine";
import { ERRORS } from "../../utils/errors";

export const publishForm = internalAction({
  args: {
    id: v.id("forms"),
  },
  handler: async (ctx, { id }) => {
    const form = await ctx.runQuery(
      internal.collections.forms.queries.getByIdInternal,
      { id }
    );

    if (!form) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    const config = {
      campaignId: form.campaignId,
      schema: form.schema,
    };

    try {
      // Store the Config in KV
      await engineAPIClient.kv.config.$post({
        json: {
          key: `form:${form._id}`,
          value: JSON.stringify(config),
          options: {
            metadata: {},
          },
        },
      });
    } catch (error) {
      console.error(error);
      throw new ConvexError(ERRORS.SOMETHING_WENT_WRONG);
    }
  },
});
