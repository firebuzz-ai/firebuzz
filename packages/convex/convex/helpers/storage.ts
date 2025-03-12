import { ConvexError } from "convex/values";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { S3Client } from "@aws-sdk/client-s3";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const storeStringInR2 = internalAction({
  args: {
    string: v.string(),
    key: v.string(),
    metadata: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, args) => {
    // Convert the string to a buffer
    const filesTXT = new TextEncoder().encode(args.string);

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
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: args.key,
        Body: Buffer.from(filesTXT),
        Metadata: args.metadata,
      });

      await S3.send(command);
    } catch (error) {
      console.error(error);
      throw new ConvexError("Failed to store landing page version");
    }
  },
});
