import { Hono } from "hono";
import type { Env } from "../../env";

const app = new Hono<{ Bindings: Env }>();

app.get("*", async (c) => {
	return c.html(`<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="robots" content="noindex, nofollow" />
			<title>Campaign Not Found — Firebuzz</title>
			<link rel="icon" href="https://cdn.getfirebuzz.com/firebuzz-favicon.png" />
			<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@geist/font@latest/mono.css" />
			<style>
				:root {
					/* Colors aligned to packages/ui/src/globals.css (dark theme) */
					--bg: hsl(0 0% 4%);
					--fg: hsl(0 0% 100%);
					--muted: hsl(0 0% 68%);
					--surface: hsl(30 9% 9%);
					--brand: hsl(25 94.6% 56.5%);
					--brand-foreground: hsl(0 0% 4%);
					--font-geist-mono: "Geist Mono", ui-monospace, SFMono-Regular, Roboto Mono, Menlo, Monaco, Liberation Mono, DejaVu Sans Mono, Courier New, monospace;
				}
				html, body { height: 100%; width: 100%; overflow: hidden; }
				body {
					margin: 0;
					background: var(--bg);
					color: var(--fg);
					font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
					-webkit-font-smoothing: antialiased;
					-moz-osx-font-smoothing: grayscale;
				}
				.wrapper {
					height: 100vh;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 28px;
					text-align: center;
					padding: 24px;
					box-sizing: border-box;
					/* Use mono brand font for main content to match request */
					font-family: var(--font-geist-mono);
				}
				.logo-frame {
					width: 80px;
					height: 80px;
					border-radius: 18px;
					background: radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0) 70%);
					border: 1px solid rgba(255,255,255,0.08);
					display: inline-flex;
					align-items: center;
					justify-content: center;
					box-shadow: 0 10px 30px rgba(0,0,0,0.35);
				}
				.logo-svg { width: 46px; height: 46px; display: block; }
				h1 {
					margin: 0;
					font-size: clamp(28px, 4vw, 40px);
					font-weight: 600;
					letter-spacing: -0.01em;
				}
				.accent { color: var(--brand); }
				.lead {
					max-width: 820px;
					margin: 0 auto;
					font-size: clamp(16px, 2.2vw, 20px);
					line-height: 1.6;
					color: var(--muted);
				}

				.hint { color: var(--muted); font-size: 14px; margin-top: -6px; }
				.text-link { color: var(--brand); text-decoration: underline; text-underline-offset: 2px; }
				.text-link:hover { opacity: 0.9; }
				.footer { position: fixed; bottom: 16px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 13px; }
				.footer img { width: 16px; height: 16px; display: inline-block; }
			</style>
		</head>
		<body>
			<main class="wrapper" role="main">
				<div class="logo-frame" aria-hidden="true">
					<img class="logo-svg" src="https://cdn.getfirebuzz.com/firebuzz-icon.svg" alt="" width="46" height="46" />
				</div>
				<h1>Landing Page <span class="accent">Not Found</span></h1>
				<p class="lead">
					We couldn't find a landing page at this address. It may not be published yet, or you might have just made changes. Please wait up to 60 seconds for the cache to refresh and try again.
				</p>

				<div class="hint">Is this your landing page? <a class="text-link" href="https://app.getfirebuzz.com" target="_blank" rel="noopener noreferrer">Manage your landing page</a></div>
			</main>
			<div class="footer">
				<img src="https://cdn.getfirebuzz.com/firebuzz-icon.svg" alt="Firebuzz" width="16" height="16" />
				<span>© ${new Date().getFullYear()} Firebuzz</span>
			</div>
		</body>
	</html>`);
});

export { app as landingNotFound };
