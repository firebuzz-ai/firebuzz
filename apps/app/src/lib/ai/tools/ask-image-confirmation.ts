import { tool } from "ai";
import { z } from "zod";

export const askImageConfirmation = tool({
  description:
    "Ask the user to confirm which images they want to use from search results. At least 3-5 images you should show to the user.",
  parameters: z.object({
    images: z.array(
      z.object({
        id: z.string(),
        width: z.number(),
        height: z.number(),
        url: z.string(),
        downloadLink: z.string(),
        altText: z.string().optional(),
      })
    ),
  }),
});
