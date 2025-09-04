import type { Doc, Id } from "@firebuzz/convex";
import { FileSystem } from "@firebuzz/file-system";
import { ConvexError } from "convex/values";

export function applyCampaignToTemplate(
	files: string,
	campaign: Doc<"campaigns">,
	form: Doc<"forms"> | null,
	landingPageId: Id<"landingPages">,
) {
	if (campaign.type === "lead-generation" && !form) {
		throw new ConvexError("Form not found for lead-generation campaign");
	}

	const fileSystem = new FileSystem(files);
	const campaignConfigPath = "src/configuration/campaign.ts";

	// Get schema from canvas nodes
	const formNode = form?.nodes?.find(
		(node) => node.type === "form" && node.data,
	);
	const schema = formNode?.data?.schema || [];

	const primaryGoal = {
		event_id: campaign.campaignSettings.primaryGoal.id,
		event_type: campaign.campaignSettings.primaryGoal.type,
		event_value: campaign.campaignSettings.primaryGoal.value,
		event_value_type: campaign.campaignSettings.primaryGoal.isCustom
			? "dynamic"
			: "static",
		event_value_currency: campaign.campaignSettings.primaryGoal.currency,
		isCustom: campaign.campaignSettings.primaryGoal.isCustom,
	};

	const customEvents = campaign.campaignSettings.customEvents?.map((event) => ({
		event_id: event.id,
		event_type: event.type,
		event_value: event.value,
		event_value_type: "dynamic",
		event_value_currency: event.currency,
		isCustom: event.isCustom,
	}));

	const campaignConfig = {
		workspaceId: campaign.workspaceId,
		projectId: campaign.projectId,
		campaignId: campaign._id,
		landingPageId: landingPageId,
		analyticsEnabled: false,
		primaryGoal,
		customEvents,
		campaignType: campaign.type,
		formId: form?._id,
		apiUrl: `${process.env.ENGINE_URL}`,
		schema: schema,
		submitButtonText: formNode?.data?.submitButtonText,
		successMessage: formNode?.data?.successMessage,
		successRedirectUrl: formNode?.data?.successRedirectUrl,
	};

	const configString = `
// LLM Directives:
// - You are NOT ALLOWED to delete file or anything in this file.
// - You can get new schema or new primary goal or new custom events with your TOOLS and you can change them in this file. Don't change them manually, only trust server side data that you get from the tool calls.
// - You are NOT ALLOWED to change schema items any value rather than "title", "description" or "placeholder", "submitButtonText", "successMessage", "successRedirectUrl" (these only), if user requests to change it you should not do it because it will throw an error on server side. If users insist it let them know they need to change their campaign settings.
// - Beyond these instructions, you are allowed to change anything in this file.

export const campaignConfiguration = ${JSON.stringify(
		campaignConfig,
		null,
		2,
	)};`.trim();

	fileSystem.writeFile(campaignConfigPath, configString);

	return fileSystem.toString();
}
