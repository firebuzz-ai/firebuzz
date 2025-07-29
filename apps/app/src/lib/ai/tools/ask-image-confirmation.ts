import { tool } from "ai";
import { z } from "zod";

export const askImageConfirmation = tool({
	description:
		"Ask the user to confirm which images they want to use from search results. This tool waits for user interaction and does not complete automatically.",
	parameters: z.object({
		message: z.string(),
		placements: z
			.array(
				z.object({
					id: z.string().describe("Unique identifier for this placement"),
					location: z.string().describe("Where the image will be placed"),
					description: z
						.string()
						.describe("Description of what this image is for"),
					requiredCount: z
						.number()
						.describe("Number of images needed for this placement"),
					aspectRatio: z
						.enum(["landscape", "portrait", "square", "any"])
						.optional()
						.describe("Preferred aspect ratio for this placement"),
				}),
			)
			.describe("List of image placements with details about where and how images will be used"),
	}),
	// No execute function - this tool waits for user interaction through the UI
});
