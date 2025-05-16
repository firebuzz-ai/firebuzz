import { tool } from "ai";
import { z } from "zod";

// Define type for Unsplash API results
interface UnsplashResult {
	id: string;
	width: number;
	height: number;
	description: string | null;
	urls: {
		raw: string;
		full: string;
		regular: string;
		small: string;
		thumb: string;
	};
	links: {
		self: string;
		html: string;
		download: string;
	};
	user: {
		username: string;
		name?: string;
	};
}

export const searchStockImage = tool({
	description: "Search for stock images on Unsplash",
	parameters: z.object({
		query: z.string().describe("The search term for the image"),
		orientation: z
			.enum(["landscape", "portrait", "squarish"])
			.describe("The orientation of the image"),
		color: z
			.enum([
				"black_and_white",
				"black",
				"white",
				"yellow",
				"orange",
				"red",
				"purple",
				"magenta",
				"green",
				"teal",
				"blue",
			])
			.optional()
			.describe("Filter by a specific color"),
	}),
	execute: async ({ query, orientation, color }) => {
		try {
			let url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}`;

			if (color) {
				url += `&color=${color}`;
			}

			const response = await fetch(url, {
				headers: {
					Authorization:
						"Client-ID q24Wb1VW0XWpcWhVxrb9-eY1_fmsrpjsOih_s8Mw55M",
				},
			});

			if (!response.ok) {
				throw new Error(
					`Unsplash API responded with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Limit to 8 results to avoid overwhelming the UI
			const results = data.results.slice(0, 8).map((result: UnsplashResult) => {
				return {
					id: result.id,
					width: result.width,
					height: result.height,
					url: result.urls.regular,
					downloadLink: result.links.download,
					altText:
						result.description ||
						`Image by ${result.user.name || result.user.username}`,
				};
			});

			if (results.length === 0) {
				return {
					success: false,
					message: `No images found for query "${query}" with orientation "${orientation}"${color ? ` and color "${color}"` : ""}`,
				};
			}

			return {
				success: true,
				count: results.length,
				images: results,
				message: `Found ${results.length} images for "${query}"`,
			};
		} catch (error) {
			console.error("Error searching stock images:", error);
			return {
				success: false,
				message: `Failed to search stock images: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
