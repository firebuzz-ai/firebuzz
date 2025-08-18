import { bearerAuth } from "hono/bearer-auth";
import { createMiddleware } from "hono/factory";
import type { Env } from "./env";
import { previewApp } from "./preview";
import { productionCustomDomainApp } from "./production/custom-domain";
import { productionProjectDomainApp } from "./production/firebuzz-subdomain";

export const apiAuth = createMiddleware<{ Bindings: Env }>((c, next) => {
	const auth = bearerAuth({
		token: c.env.SERVICE_TOKEN,
	});
	return auth(c, next);
});

export const cors = createMiddleware<{ Bindings: Env }>((c, next) => {
	c.res.headers.set("Access-Control-Allow-Origin", "*");
	c.res.headers.set(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS",
	);
	c.res.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	);
	return next();
});

export const domainRouting = createMiddleware<{ Bindings: Env }>(
	async (c, next) => {
		const campaign = c.req.header("X-Firebuzz-Campaign") || "";
		const domainType = c.req.header("X-Firebuzz-Domain-Type") || "";
		const preview = c.req.header("X-Firebuzz-Preview") || "";

		// Production Routing (Campaign - Custom and Project Domains)
		if (campaign) {
			// Custom Domain Routing
			if (domainType === "c") {
				return productionCustomDomainApp.fetch(c.req.raw, c.env);
			}

			// Project Domain Routing (Firebuzz Subdomain)
			return productionProjectDomainApp.fetch(c.req.raw, c.env);
		}

		// Preview Routing (Campaign & Landing Page Previews)
		if (preview) {
			return previewApp.fetch(c.req.raw, c.env);
		}

		// Continue with normal routing for other domains
		await next();
	},
);
