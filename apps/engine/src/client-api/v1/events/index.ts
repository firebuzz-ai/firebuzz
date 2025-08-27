import { OpenAPIHono } from "@hono/zod-openapi";
import { batchTrackRoute } from "./batch-track";
import { externalTrackRoute } from "./external-track";
import { sessionRoutes } from "./session";
import { trackRoute } from "./track";

export const eventsRoutes = new OpenAPIHono<{ Bindings: Env }>()
	.route("/", trackRoute)
	.route("/", batchTrackRoute)
	.route("/", externalTrackRoute)
	.route("/", sessionRoutes);
