import { v } from "convex/values";
import { internalQuery } from "../../../../_generated/server";

export const getByIdInternal = internalQuery({
  args: {
    id: v.id("mediaVectors"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
