import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

import { createClient } from "@engine/api";

export const storeInKV = internalAction({
  args: {
    key: v.string(),
    html: v.string(),
    js: v.string(),
    css: v.string(),
  },
  handler: async (_ctx, { key, html, js, css }) => {
    const engineAPIClient = createClient(process.env.ENGINE_URL);
    const htmlPromise = engineAPIClient.kv.assets.$post(
      {
        json: {
          key: key,
          value: html,
          options: {
            metadata: {
              contentType: "html",
              projectId: "1",
              landingId: "1",
              variantId: "1",
              language: "en",
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
        },
      }
    );

    const jsPromise = engineAPIClient.kv.assets.$post(
      {
        json: {
          key: `${key}/assets/script`,
          value: js,
          options: {
            metadata: {
              contentType: "js",
              projectId: "1",
              landingId: "1",
              variantId: "1",
              language: "en",
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
        },
      }
    );

    const cssPromise = engineAPIClient.kv.assets.$post(
      {
        json: {
          key: `${key}/assets/styles`,
          value: css,
          options: {
            metadata: {
              contentType: "css",
              projectId: "1",
              landingId: "1",
              variantId: "1",
              language: "en",
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
        },
      }
    );

    await Promise.all([htmlPromise, jsPromise, cssPromise]);
  },
});
