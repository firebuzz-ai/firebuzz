import { OpenAPIHono } from "@hono/zod-openapi";
import { consentRecordRoute } from "./record";

const consentRoutes = new OpenAPIHono<{ Bindings: Env }>()
	.route("/record", consentRecordRoute);

export { consentRoutes };