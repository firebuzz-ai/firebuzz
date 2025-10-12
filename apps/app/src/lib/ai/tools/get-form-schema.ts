import { auth } from "@clerk/nextjs/server";
import { api, ConvexError, fetchQuery, type Id } from "@firebuzz/convex/nextjs";
import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

export const getFormSchema = tool({
	description: stripIndents`
    Get the current schema of campaign form.
    If it's a 'lead-generation' this function will return the current schema of the form.
    Otherwise, it will throw an error.
  `,
	parameters: z.object({
		campaignId: z.string().describe("The campaign id."),
	}),
	execute: async ({ campaignId }) => {
		try {
			const token = await (await auth()).getToken({ template: "convex" });

			if (!token) {
				return { success: false, message: "Unauthorized" };
			}

			const form = await fetchQuery(
				api.collections.forms.queries.getByCampaignId,
				{
					campaignId: campaignId as Id<"campaigns">,
				},
				{ token },
			);

			const formData = form.nodes?.find((node) => node.type === "form")?.data;

			if (!formData) {
				return { success: false, message: "Form schema is not available." };
			}

			return {
				success: true,
				schema: formData.schema,
				submitButtonText: formData.submitButtonText,
				successMessage: formData.successMessage,
				successRedirectUrl: formData.successRedirectUrl,
			};
		} catch (error) {
			console.error(error);
			return {
				success: false,
				message:
					error instanceof ConvexError
						? error.data
						: "An error occurred while getting the form schema.",
			};
		}
	},
});
