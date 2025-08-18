import { Hono } from "hono";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

type DomainConfig = {
	w: string; // workspace id
	p: string; // project id
	e: "dev" | "preview" | "production"; // environment
	t: "c" | "p"; // type: c = custom domain, p = project domain
};

const workers = {
	dev: "https://engine-dev.frbzz.com",
	preview: "https://engine-preview.frbzz.com",
	production: "https://engine.frbzz.com",
};

const firebuzzPreviewHostnames = [
	{
		hostname: "preview.frbzz.com",
		worker: workers.production,
		env: "production",
	},
	{
		hostname: "preview-dev.frbzz.com",
		worker: workers.dev,
		env: "dev",
	},
	{
		hostname: "preview-preview.frbzz.com",
		worker: workers.preview,
		env: "preview",
	},
];

app.all("*", async (c) => {
	const hostname = c.req.header("host") ?? "";

	const previewHostname = firebuzzPreviewHostnames.find(
		(previewHostname) => previewHostname.hostname === hostname,
	);

	// Preview Routing (Campaign & Landing Page Previews)
	if (previewHostname) {
		const engineURL = previewHostname.worker;

		const newHeaders = new Headers(c.req.header());
		newHeaders.set("X-Firebuzz-Preview", "true");
		newHeaders.set("X-User-Hostname", hostname);
		newHeaders.set("X-Environment", previewHostname.env);

		// Get the original request URL details
		const url = new URL(c.req.url);

		return fetch(`${engineURL}${url.pathname}${url.search}`, {
			method: c.req.method,
			headers: newHeaders,
			body:
				c.req.method !== "GET" && c.req.method !== "HEAD"
					? await c.req.arrayBuffer()
					: undefined,
		});
	}

	// Production Routing (Campaign)
	const config = await c.env.DOMAIN_CONFIG.get<DomainConfig>(hostname, {
		cacheTtl: 60 * 60 * 24 * 30,
		type: "json",
	});

	if (!config) {
		return c.json({ error: "Config not found" }, 404);
	}

	// Get the target worker URL based on environment, default to production
	const targetWorkerUrl =
		workers[config.e as keyof typeof workers] || workers.production;
	const domainType = config.t === "c" ? "custom" : "project";

	// Create new headers with the original request headers plus custom ones
	const newHeaders = new Headers(c.req.header());
	newHeaders.set("X-Firebuzz-Campaign", "true");
	newHeaders.set("X-Firebuzz-Domain-Type", domainType);
	newHeaders.set("X-User-Hostname", hostname);
	newHeaders.set("X-Project-Id", config.p);
	newHeaders.set("X-Workspace-Id", config.w);
	newHeaders.set("X-Environment", config.e);

	// Get the original request URL details
	const url = new URL(c.req.url);

	// Forward the entire request to the target worker
	return fetch(`${targetWorkerUrl}${url.pathname}${url.search}`, {
		method: c.req.method,
		headers: newHeaders,
		body:
			c.req.method !== "GET" && c.req.method !== "HEAD"
				? await c.req.arrayBuffer()
				: undefined,
	});
});

export default app;
