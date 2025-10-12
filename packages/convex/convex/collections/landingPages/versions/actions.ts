import { ConvexError, v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { r2 } from "../../../components/r2";

export const store = internalAction({
	args: {
		key: v.string(),
		filesString: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const file = new TextEncoder().encode(args.filesString);
			await r2.store(ctx, file, args.key);
		} catch (error) {
			console.error(error);
			throw new ConvexError("Failed to store landing page version");
		}
	},
});

export const storeTar = internalAction({
	args: {
		key: v.string(),
		tarBuffer: v.array(v.number()),
	},
	handler: async (ctx, args) => {
		try {
			const buffer = new Uint8Array(args.tarBuffer);
			await r2.store(ctx, buffer, args.key);
		} catch (error) {
			console.error(error);
			throw new ConvexError("Failed to store tar archive");
		}
	},
});
