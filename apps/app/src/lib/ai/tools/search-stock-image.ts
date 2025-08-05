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
	description:
		"Search for stock images on Unsplash with support for refresh and custom queries",
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
		page: z
			.number()
			.min(1)
			.max(50)
			.default(1)
			.describe("Page number for pagination (1-50)"),
		perPage: z
			.number()
			.min(1)
			.max(30)
			.default(8)
			.describe("Number of images per page (1-30)"),
	}),
	execute: async ({ query, orientation, color, page = 1, perPage = 8 }) => {
		try {
			let url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&page=${page}&per_page=${perPage}`;

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

			// Process all results from the API response (already limited by perPage parameter)
			const results = data.results.map((result: UnsplashResult) => {
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
				total: data.total || results.length,
				page,
				perPage,
				images: results,
				message: `Found ${results.length} images for "${query}" (page ${page})`,
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
