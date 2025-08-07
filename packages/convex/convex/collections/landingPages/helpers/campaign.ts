import type { Doc } from "@firebuzz/convex";
import { FileSystem } from "@firebuzz/file-system";
import { ConvexError } from "convex/values";

export function applyCampaignToTemplate(
	files: string,
	campaign: Doc<"campaigns">,
	form: Doc<"forms"> | null,
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

	const campaignConfig = {
		campaignType: campaign.type,
		formId: form?._id,
		apiUrl: `${process.env.ENGINE_URL}/client-api/v1`,
		schema: schema,
		submitButtonText: formNode?.data?.submitButtonText,
		successMessage: formNode?.data?.successMessage,
		successRedirectUrl: formNode?.data?.successRedirectUrl,
	};

	const configString = `
// LLM Directives:
// - You are not allowed to change anyhting in this file even if user requests to change it you should not do it
// - You are NOT ALLOWED to change schema items any value rather than "title", "description" or "placeholder" (these only), if user requests to change it you should not do it because it will throw an error on server side. If users insist it let them know they need to change their campaign settings.

export const campaignConfiguration = ${JSON.stringify(
		campaignConfig,
		null,
		2,
	)};`.trim();

	fileSystem.writeFile(campaignConfigPath, configString);

	return fileSystem.toString();
}
