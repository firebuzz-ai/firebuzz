import { bearerAuth } from "hono/bearer-auth";
import { createMiddleware } from "hono/factory";
import type { Env } from "./env";
import { previewApp } from "./preview";
import { productionApp } from "./production";

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
		const hostname = c.req.header("host") || "";
		const landingPage = c.req.header("X-Landing-Page") || "";

		if (landingPage) {
			return productionApp.fetch(c.req.raw, c.env);
		}

		// If request is coming from preview.getfirebuzz.com,
		// route it accordingly without the /preview prefix
		if (hostname === "preview.getfirebuzz.com") {
			// Create a new request with the modified URL path

			return previewApp.fetch(c.req.raw, c.env);
		}

		// Continue with normal routing for other domains
		await next();
	},
);
