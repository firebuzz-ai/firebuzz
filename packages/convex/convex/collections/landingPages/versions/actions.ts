import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ConvexError, v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { S3 } from "../../../helpers/r2";

export const store = internalAction({
  args: {
    key: v.string(),
    metadata: v.record(v.string(), v.string()),
    filesString: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const file = new TextEncoder().encode(args.filesString);
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: args.key,
        Body: file,
        Metadata: args.metadata,
        ContentType: "text/plain",
      });

      await S3.send(command);
    } catch (error) {
      console.error(error);
      throw new ConvexError("Failed to store landing page version");
    }
  },
});
