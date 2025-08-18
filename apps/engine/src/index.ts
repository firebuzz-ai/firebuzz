import { Hono } from "hono";
import { apiRoutes } from "./api";
import { clientApiRoutes } from "./client-api";
import type { Env } from "./env";
import { domainRouting } from "./middleware";
import { inngestApp } from "./workflows";

const app = new Hono<{ Bindings: Env }>().use(domainRouting);

// Inngest Routes
app.route("/api/workflows", inngestApp);

// Authenticated API Routes
app.route("/api/v1/", apiRoutes);

// Public Client API Routes
app.route("/client-api/v1/", clientApiRoutes);

app.get("/", async (c) => {
	return c.json({
		message: "Hello Firebuzz!",
	});
});

export default app;
