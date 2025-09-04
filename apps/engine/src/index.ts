import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { apiRoutes } from "./api";
import { clientApiRoutes } from "./client-api";
import { domainRouting } from "./middleware";
import { trackScriptRoute } from "./static/track";
import { utilityRoutes } from "./utility-routes";
import { inngestApp } from "./workflows";

const app = new Hono<{ Bindings: Env }>().use(domainRouting);

const clerkTestRoute = new Hono<{ Bindings: Env }>()
	.use(
		cors({
			origin: ["http://localhost:3000", "https://localhost:3000"],
			credentials: true,
		}),
	)
	.use(async (c, next) => {
		return clerkMiddleware({
			secretKey: c.env.CLERK_SECRET_KEY,
			publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
		})(c, next);
	});

clerkTestRoute.get("/", async (c) => {
	const session = getAuth(c);
	return c.json({
		session,
	});
});

// Test
app.route("/testclerk", clerkTestRoute);

// Inngest Routes
app.route("/api/workflows", inngestApp);

// Authenticated API Routes
app.route("/api/v1/", apiRoutes);

// Public Client API Routes
app.route("/client-api/v1/", clientApiRoutes);

// Utility Routes
app.route("/utility", utilityRoutes);

// Tracking Script Route
app.route("/track.js", trackScriptRoute);

app.get("/", async (c) => {
	return c.json({
		message: "Hello Firebuzz!",
	});
});

import { handleEventQueue } from "./queue/event-consumer";
// Import and re-export queue handlers directly
import { handleSessionQueue } from "./queue/session-consumer";

// Export the Durable Object classes
export { ABTestDurableObject } from "./durable-objects/ab-test";
export { EventTrackerDurableObject } from "./durable-objects/event-tracker";

// Export both fetch and queue handlers in the default export
export default {
	fetch: app.fetch,
	async queue(batch: MessageBatch, env: Env): Promise<void> {
		// Route to appropriate queue handler based on queue name
		const queueName = batch.queue;

		console.log(
			`📥 Processing queue: ${queueName} with ${batch.messages.length} messages`,
		);

		if (queueName.includes("session-ingestion")) {
			await handleSessionQueue(batch, env);
		} else if (queueName.includes("event-ingestion")) {
			await handleEventQueue(batch, env);
		} else {
			console.error(`Unknown queue: ${queueName}`);
			// Acknowledge all messages to prevent infinite retry
			for (const message of batch.messages) {
				message.ack();
			}
		}
	},
};
