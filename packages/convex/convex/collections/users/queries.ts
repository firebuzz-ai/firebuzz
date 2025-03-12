import { internalQuery, query } from "../../_generated/server";
import { getCurrentUser } from "./utils";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const getCurrentUserInternal = internalQuery({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
