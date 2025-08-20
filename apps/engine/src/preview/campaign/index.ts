import { Hono } from "hono";
import type { Env } from "../../env";
import type { CampaignConfig } from "../../types/campaign";

const app = new Hono<{ Bindings: Env }>();

// Preview [Campaign]
app.get("/:id", async (c) => {
	const campaignId = c.req.param("id");

	const config = await c.env.CAMPAIGN.get<CampaignConfig>(
		`campaign:preview:${campaignId}`,
		{
			type: "json",
		},
	);

	if (!config) {
		return c.redirect("/utility/campaign-not-found");
	}

	// Check Default Landing Page
	const defaultLandingPageId = config.defaultLandingPageId;

	const html = await c.env.ASSETS.get(
		`landing:preview:${defaultLandingPageId}`,
	);

	if (!html) {
		return c.text("Not found", 404);
	}

	return c.html(html);
});

export { app as previewCampaignApp };
