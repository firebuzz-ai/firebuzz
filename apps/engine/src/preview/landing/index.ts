import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Preview [Landing Page]

// HTML Route
app.get("/:id", async (c) => {
	const id = c.req.param("id");
	const key = `landing:preview:${id}`;

	let html = await c.env.ASSETS.get(key);

	if (!html) {
		return c.redirect(`/utility/landing-not-found/${id}`);
	}

	// Check if cookie banner should be disabled via query param
	const disableCookieBanner = c.req.query("disableCookieBanner") === "true";
	const disableFirebuzzBadge = c.req.query("disableFirebuzzBadge") === "true";

	if (disableCookieBanner) {
		// Inject flag to disable cookie banner
		const bannerScript =
			"<script>window.__FIREBUZZ_DISABLE_CONSENT_BANNER__ = true;</script>";
		html = html.replace("</head>", `${bannerScript}</head>`);
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

	c.header("X-Frame-Options", "ALLOWALL");
	c.header("Content-Security-Policy", "frame-ancestors *");

	return c.html(html);
});

// Assets Route (CSS/JS)
app.get("/:id/assets/:asset", async (c) => {
	const id = c.req.param("id");
	const assetP = c.req.param("asset");
	const key = `landing:preview:${id}:assets:${assetP}`;

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

export { app as previewLandingApp };
