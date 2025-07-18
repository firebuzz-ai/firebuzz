import { auth } from "@clerk/nextjs/server";
import { ConvexError, type Id, api, fetchQuery } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

interface AudienceData {
	_id: Id<"audiences">;
	name: string;
	description: string;
	gender: "male" | "female";
	age: "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+";
	goals: string;
	motivations: string;
	frustrations: string;
	terminologies: string[];
	avatar?: string;
	updatedAt?: string;
}

interface TestimonialData {
	_id: Id<"testimonials">;
	name: string;
	avatar?: string;
	title?: string;
	content: string;
	rating?: number;
	updatedAt?: string;
}

interface SocialData {
	_id: Id<"socials">;
	platform: string;
	handle: string;
	url: string;
	updatedAt?: string;
}

interface FeatureData {
	_id: Id<"features">;
	name: string;
	description: string;
	benefits: string;
	proof: string;
	updatedAt?: string;
}

type MarketingDataItem =
	| AudienceData
	| TestimonialData
	| SocialData
	| FeatureData;

interface PaginationResult {
	page: MarketingDataItem[];
	isDone: boolean;
	continueCursor: string | null;
}

export const getMarketingData = tool({
	description: stripIndents`
		Get marketing data from the brand collections including audiences, testimonials, socials, and features.
		This tool supports pagination and can fetch specific types of marketing data for the current project.
		Use this to access detailed information about the brand's target audiences, customer testimonials, social media presence, and product features.
	`,
	parameters: z.object({
		dataType: z
			.union([
				z.literal("audiences"),
				z.literal("testimonials"),
				z.literal("socials"),
				z.literal("features"),
			])
			.describe("The type of marketing data to fetch"),
		searchQuery: z
			.string()
			.optional()
			.describe("Optional search query to filter results"),
		numItems: z
			.number()
			.min(1)
			.max(50)
			.default(10)
			.describe("Number of items to fetch per page (1-50)"),
		cursor: z
			.string()
			.optional()
			.describe("Pagination cursor for fetching next page of results"),
	}),
	execute: async ({ dataType, searchQuery, numItems, cursor }) => {
		try {
			// Get Token
			const token = await (await auth()).getToken({ template: "convex" });

			if (!token) {
				return {
					success: false,
					message: "Unauthorized",
				};
			}

			// Fetch marketing data
			const result = (await fetchQuery(
				api.collections.brands.queries.getMarketingData,
				{
					dataType,
					searchQuery,
					paginationOpts: {
						numItems,
						cursor: cursor ?? null,
					},
				},
				{
					token,
				},
			)) as PaginationResult;

			// Format the response based on data type
			let formattedData: Array<{
				id:
					| Id<"audiences">
					| Id<"testimonials">
					| Id<"socials">
					| Id<"features">;
				[key: string]: unknown;
			}>;
			switch (dataType) {
				case "audiences":
					formattedData = result.page.map((item) => {
						const audienceItem = item as AudienceData;
						return {
							id: audienceItem._id,
							name: audienceItem.name,
							description: audienceItem.description,
							gender: audienceItem.gender,
							age: audienceItem.age,
							goals: audienceItem.goals,
							motivations: audienceItem.motivations,
							frustrations: audienceItem.frustrations,
							terminologies: audienceItem.terminologies,
							avatar: audienceItem.avatar,
							updatedAt: audienceItem.updatedAt,
						};
					});
					break;
				case "testimonials":
					formattedData = result.page.map((item) => {
						const testimonialItem = item as TestimonialData;
						return {
							id: testimonialItem._id,
							name: testimonialItem.name,
							avatar: testimonialItem.avatar,
							title: testimonialItem.title,
							content: testimonialItem.content,
							rating: testimonialItem.rating,
							updatedAt: testimonialItem.updatedAt,
						};
					});
					break;
				case "socials":
					formattedData = result.page.map((item) => {
						const socialItem = item as SocialData;
						return {
							id: socialItem._id,
							platform: socialItem.platform,
							handle: socialItem.handle,
							url: socialItem.url,
							updatedAt: socialItem.updatedAt,
						};
					});
					break;
				case "features":
					formattedData = result.page.map((item) => {
						const featureItem = item as FeatureData;
						return {
							id: featureItem._id,
							name: featureItem.name,
							description: featureItem.description,
							benefits: featureItem.benefits,
							proof: featureItem.proof,
							updatedAt: featureItem.updatedAt,
						};
					});
					break;
				default:
					throw new Error("Invalid data type");
			}

			return {
				success: true,
				dataType,
				searchQuery,
				data: formattedData,
				pagination: {
					hasMore: result.isDone === false,
					cursor: result.continueCursor,
					totalFetched: result.page.length,
				},
			};
		} catch (error) {
			console.error(error);
			return {
				success: false,
				message:
					error instanceof ConvexError
						? error.message
						: "An error occurred while fetching marketing data",
			};
		}
	},
});
