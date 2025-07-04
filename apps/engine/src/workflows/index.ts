import { Hono } from "hono";
import { serve } from "inngest/hono";
import { functions, inngest } from "./inngest";

const app = new Hono();

app.on(
	["GET", "PUT", "POST"],
	"/",
	serve({
		client: inngest,
		functions,
	}),
);

export { app as inngestApp };
