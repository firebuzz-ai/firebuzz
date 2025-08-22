import { formatUrlWithProtocol, hashString } from "@firebuzz/utils";
import FirecrawlApp, {
  type BatchScrapeStatusResponse,
  type ScrapeResponse,
} from "@mendable/firecrawl-js";
import { ConvexError, v } from "convex/values";
import { internalAction } from "../_generated/server";
import { ERRORS } from "../utils/errors";
import { engineAPIClient } from "./engine";

const apiKey = process.env.FIRECRAWL_API_KEY;

const engineServiceToken = process.env.ENGINE_SERVICE_TOKEN;

if (!apiKey) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const firecrawl = new FirecrawlApp({
  apiKey,
});

export const scrapeUrl = internalAction({
  args: {
    url: v.string(),
    formats: v.array(
      v.union(
        v.literal("screenshot@fullPage"),
        v.literal("markdown"),
        v.literal("html"),
        v.literal("rawHtml"),
        v.literal("json"),
        v.literal("links")
      )
    ),
    onlyMainContent: v.optional(v.boolean()),
    waitFor: v.optional(v.number()),
    returnType: v.optional(v.union(v.literal("full"), v.literal("key"))),
  },
  handler: async (_ctx, args) => {
    const {
      url,
      formats,
      waitFor,
      onlyMainContent,
      returnType = "full",
    } = args;

    const key = `firecrawl-${hashString(
      JSON.stringify({
        url,
        formats,
        onlyMainContent: onlyMainContent ?? false,
        waitFor: waitFor ?? 0,
      })
    )}`;

    try {
      const kvResponse = await engineAPIClient.kv.cache.$get(
        {
          query: {
            key,
            type: "text",
            withMetadata: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${engineServiceToken}`,
          },
        }
      );

      const kvData = await kvResponse.json();

      if (kvData?.success) {
        if (returnType === "key") return key;
        const data = JSON.parse(kvData.data.value as string);
        return data as unknown as ScrapeResponse;
      }
    } catch (error) {
      console.log(error);
    }

    let validURL: string | null;
    try {
      validURL = formatUrlWithProtocol(url);
    } catch (error) {
      console.error(error);
      throw new ConvexError(ERRORS.INVALID_ARGUMENTS);
    }

    if (!validURL) {
      throw new ConvexError(ERRORS.INVALID_ARGUMENTS);
    }

    const response = await firecrawl.scrapeUrl(validURL, {
      formats,
      onlyMainContent,
      waitFor,
    });

    if (!response.success) {
      console.error(response.error);
      throw new ConvexError(ERRORS.FIRECRAWL_SCRAPE_URLS_ERROR);
    }

    // Store in KV
    try {
      await engineAPIClient.kv.cache.$post({
        json: {
          key: key,
          value: JSON.stringify(response),
          options: {
            metadata: {
              url,
            },
            expirationTtl: 1000 * 60 * 60 * 24 * 7, // 7 days
          },
        },
      });
    } catch (error) {
      console.error(error);
    }

    if (returnType === "key") return key;

    return response;
  },
});

export const batchScrapeUrls = internalAction({
  args: {
    urls: v.array(v.string()),
    formats: v.array(
      v.union(
        v.literal("screenshot@fullPage"),
        v.literal("markdown"),
        v.literal("html"),
        v.literal("json"),
        v.literal("links")
      )
    ),
    onlyMainContent: v.optional(v.boolean()),
    waitFor: v.optional(v.number()),
    returnType: v.optional(v.union(v.literal("full"), v.literal("key"))),
  },
  handler: async (_ctx, args) => {
    const {
      urls,
      formats,
      onlyMainContent,
      waitFor,
      returnType = "full",
    } = args;

    const key = `firecrawl-batch-${hashString(
      JSON.stringify({
        urls: urls.sort(), // Sort URLs for consistent hashing
        formats: formats.sort(),
        onlyMainContent: onlyMainContent ?? false,
        waitFor: waitFor ?? 0,
      })
    )}`;

    try {
      const kvResponse = await engineAPIClient.kv.cache.$get({
        query: {
          key,
          type: "json",
          withMetadata: false,
        },
      });

      const kvData = await kvResponse.json();

      if (kvData?.success) {
        if (returnType === "key") return key;
        const data = kvData.data.value;
        return data as unknown as BatchScrapeStatusResponse;
      }
    } catch (error) {
      console.error(error);
    }

    const validURLs: string[] = [];

    for (const url of urls) {
      try {
        const validURL = formatUrlWithProtocol(url);
        if (validURL) {
          validURLs.push(validURL);
        }
      } catch (error) {
        console.error(error);
        throw new ConvexError(ERRORS.INVALID_ARGUMENTS);
      }
    }

    if (validURLs.length === 0) {
      throw new ConvexError(ERRORS.INVALID_ARGUMENTS);
    }

    const response = await firecrawl.batchScrapeUrls(validURLs, {
      formats,
      onlyMainContent,
      waitFor,
    });

    if (!response.success) {
      console.error(response.error);
      throw new ConvexError(ERRORS.FIRECRAWL_SCRAPE_URLS_ERROR);
    }

    // Store in KV
    try {
      await engineAPIClient.kv.cache.$post({
        json: {
          key,
          value: JSON.stringify(response),
          options: {
            metadata: {
              urls,
              urlCount: urls.length,
            },
            expirationTtl: 1000 * 60 * 60 * 24 * 7, // 7 days
          },
        },
      });
    } catch (error) {
      console.error(error);
    }

    if (returnType === "key") return key;

    return response;
  },
});
