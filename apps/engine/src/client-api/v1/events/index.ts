import { OpenAPIHono } from "@hono/zod-openapi";
import { trackRoute } from "./track";
import { sessionRoutes } from "./session";

export const eventsRoutes = new OpenAPIHono<{ Bindings: Env }>()
	.route("/", trackRoute)
	.route("/", sessionRoutes);