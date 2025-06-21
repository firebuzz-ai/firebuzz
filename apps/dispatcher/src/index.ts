import { Hono } from "hono";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

app.all("*", async (c) => {
	const hostname = c.req.header("host") ?? "";

	const start = performance.now();
	const configString = await c.env.CONFIG.get(hostname, {
		cacheTtl: 60 * 60 * 24 * 30,
	});
	const end = performance.now() - start;
	if (!configString) {
		return c.json({ error: "Config not found" }, 404);
	}

	const config = JSON.parse(configString) as {
		w: string;
		p: string;
		e: string;
	};

	console.log(`Latency: ${end}ms`);

	const workers = {
		dev: "https://engine-dev.frbzz.com",
		staging: "https://engine-preview.frbzz.com",
		production: "https://engine.frbzz.com",
	};

	// Get the target worker URL based on environment, default to production
	const targetWorkerUrl =
		workers[config.e as keyof typeof workers] || workers.production;

	// Create new headers with the original request headers plus custom ones
	const newHeaders = new Headers(c.req.header());
	newHeaders.set("X-Landing-Page", "true");
	newHeaders.set("X-User-Hostname", hostname);
	newHeaders.set("X-Project-Id", config.p);
	newHeaders.set("X-Workspace-Id", config.w);
	newHeaders.set("X-Environment", config.e);

	// Get the original request URL details
	const url = new URL(c.req.url);

	console.log(
		`Forwarding request to: ${targetWorkerUrl}${url.pathname}${url.search}`,
	);

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
