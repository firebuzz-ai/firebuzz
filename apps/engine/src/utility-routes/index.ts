import { Hono } from "hono";
import { campaignNotFound } from "./campaign/not-found";
import { landingNotFound } from "./landing/not-found";

const app = new Hono<{ Bindings: Env }>();

app.route("/campaign-not-found", campaignNotFound);
app.route("/landing-not-found", landingNotFound);

export { app as utilityRoutes };
