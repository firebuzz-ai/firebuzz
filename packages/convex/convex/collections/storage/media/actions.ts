import { ConvexError, v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { r2 } from "../../../components/r2";

export const deleteMedia = internalAction({
	args: {
		key: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			await r2.deleteObject(ctx, args.key);
		} catch (error) {
			console.error(error);
			throw new ConvexError("Failed to delete media");
		}
	},
});
