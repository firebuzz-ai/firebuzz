import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Preview [Template]

// Helper function to inject scripts and badge into HTML
const injectHtmlModifications = (
	html: string,
	disableFirebuzzBadge: boolean,
	id: string,
) => {
	// Always inject script to disable cookie banner for templates
	const bannerScript =
		"<script>window.__FIREBUZZ_DISABLE_CONSENT_BANNER__ = true;</script>";
	html = html.replace("</head>", `${bannerScript}</head>`);

	// Hide scrollbars when badge is disabled (for screenshots)
	if (disableFirebuzzBadge) {
		const hideScrollbarsStyle = `
	<style>
		body::-webkit-scrollbar { display: none; }
		body { -ms-overflow-style: none; scrollbar-width: none; overflow-y: scroll; }
		html::-webkit-scrollbar { display: none; }
		html { -ms-overflow-style: none; scrollbar-width: none; }
	</style>`;
		html = html.replace("</head>", `${hideScrollbarsStyle}</head>`);
	}

	if (!disableFirebuzzBadge) {
		// Inject "Made with Firebuzz" badge
		const firebuzzBadge = `
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap" rel="stylesheet">
	<style>
		.firebuzz-badge {
			position: fixed;
			bottom: 16px;
			right: 16px;
			z-index: 9999;
			background: hsl(0deg 0% 8.02%);
			color: hsl(0deg 19.78% 97.22%);
			padding: 6px 12px;
			border-radius: 50px;
			border: 1px solid hsl(0deg 0% 0%);
			display: flex;
			align-items: center;
			gap: 6px;
			font-family: 'Geist', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 13px;
			font-weight: 500;
			text-decoration: none;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			transition: transform 0.2s ease, box-shadow 0.2s ease;
		}
		.firebuzz-badge:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		}
		.firebuzz-badge img {
			width: 16px;
			height: 16px;
		}
	</style>
	<a href="https://getfirebuzz.com?utm_source=badge&utm_medium=referral&utm_campaign=firebuzz-badge&utm_content=${id}" target="_blank" rel="noopener noreferrer" class="firebuzz-badge">
		<img src="https://cdn.getfirebuzz.com/firebuzz-icon.svg" alt="Firebuzz">
		<span>Made with Firebuzz</span>
	</a>
`;

		html = html.replace("</body>", `${firebuzzBadge}</body>`);
	}

	return html;
};

// HTML Route - Simple template by ID
app.get("/:id", async (c) => {
	const id = c.req.param("id");
	const key = `template:${id}`;

	let html = await c.env.ASSETS.get(key);

	if (!html) {
		return c.redirect(`/utility/landing-not-found/${id}`);
	}

	const disableFirebuzzBadge = c.req.query("disableFirebuzzBadge") === "true";

	html = injectHtmlModifications(html, disableFirebuzzBadge, id);

	c.header("X-Frame-Options", "ALLOWALL");
	c.header("Content-Security-Policy", "frame-ancestors *");

	return c.html(html);
});

// HTML Route - Template by workspace and ID
app.get("/:workspaceId/:id", async (c) => {
	const workspaceId = c.req.param("workspaceId");
	const id = c.req.param("id");
	const key = `template:${workspaceId}:${id}`;

	let html = await c.env.ASSETS.get(key);

	if (!html) {
		return c.redirect(`/utility/landing-not-found/${id}`);
	}

	const disableFirebuzzBadge = c.req.query("disableFirebuzzBadge") === "true";

	html = injectHtmlModifications(html, disableFirebuzzBadge, id);

	c.header("X-Frame-Options", "ALLOWALL");
	c.header("Content-Security-Policy", "frame-ancestors *");

	return c.html(html);
});

// Assets Route (CSS/JS) - Simple template by ID
app.get("/:id/assets/:asset", async (c) => {
	const id = c.req.param("id");
	const assetP = c.req.param("asset");
	const key = `template:${id}:assets:${assetP}`;

	const asset = await c.env.ASSETS.get(key);

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

// Assets Route (CSS/JS) - Template by workspace and ID
app.get("/:workspaceId/:id/assets/:asset", async (c) => {
	const workspaceId = c.req.param("workspaceId");
	const id = c.req.param("id");
	const assetP = c.req.param("asset");
	const key = `template:${workspaceId}:${id}:assets:${assetP}`;

	const asset = await c.env.ASSETS.get(key);

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

export { app as previewTemplateApp };
