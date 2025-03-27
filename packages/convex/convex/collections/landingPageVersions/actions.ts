import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConvexError, v } from "convex/values";
import { internalAction } from "../../_generated/server";

export const storeLandingPageVersion = internalAction({
	args: {
		key: v.string(),
		metadata: v.record(v.string(), v.string()),
		filesString: v.string(),
	},
	handler: async (_ctx, args) => {
		try {
			const S3 = new S3Client({
				region: "auto",
				endpoint: process.env.R2_ENDPOINT!,
				credentials: {
					accessKeyId: process.env.R2_ACCESS_KEY_ID!,
					secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
				},
			});

			const command = new PutObjectCommand({
				Bucket: process.env.R2_BUCKET!,
				Key: args.key,
				Body: new TextEncoder().encode(args.filesString),
				Metadata: args.metadata,
			});

			await S3.send(command);
		} catch (error) {
			console.error(error);
			throw new ConvexError("Failed to store landing page version");
		}
	},
});
