import { tool } from "ai";
import { z } from "zod";

export const askImageConfirmation = tool({
	description:
		"Ask the user to confirm which images they want to use from search results.",
	parameters: z.object({
		message: z.string(),
	}),
});
