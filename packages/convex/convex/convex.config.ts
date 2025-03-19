import actionRetrier from "@convex-dev/action-retrier/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();

// Aggregate
app.use(aggregate, { name: "aggregateCampaigns" });
app.use(aggregate, { name: "aggregateLandingPages" });
app.use(aggregate, { name: "aggregateLandingPageVersions" });
app.use(aggregate, { name: "aggregateLandingPageTemplates" });

// Migrations
app.use(migrations);

// R2
app.use(r2);

// Action Retrier
app.use(actionRetrier);

export default app;
