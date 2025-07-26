import { Hono } from "hono";
import { apiRoutes } from "./api";
import { clientApiRoutes } from "./client-api";
import type { Env } from "./env";
import { domainRouting } from "./middleware";
import { previewApp } from "./preview";
import { inngestApp } from "./workflows";

const app = new Hono<{ Bindings: Env }>().use(domainRouting);

// Inngest Routes
app.route("/api/workflows", inngestApp);

// Authenticated API Routes
app.route("/api/v1/", apiRoutes);

// Public Client API Routes
app.route("/client-api/v1/", clientApiRoutes);

// Preview Routes for non-preview domain
app.route("/preview", previewApp);

// Host
app.get("/:siteid", async (c) => {
	const siteid = c.req.param("siteid");

	const html = await c.env.ASSETS.get(`${siteid}`);

	if (!html) {
		return c.text("Not found", 404);
	}

	return c.html(html);
});

app.get("/:siteid/assets/:asset", async (c) => {
	const siteid = c.req.param("siteid");
	const assetP = c.req.param("asset");

	const asset = await c.env.ASSETS.get(`${siteid}/assets/${assetP}`);

	if (!asset) {
		return c.text("Not found", 404);
	}

	if (assetP === "styles") {
		c.header("Content-Type", "text/css");
	}

	if (assetP === "script") {
		c.header("Content-Type", "text/javascript");
	}

	return c.body(asset);
});

app.get("/", async (c) => {
	return c.json({
		message: "Hello Cloudflare Workers!",
	});
});

export default app;
