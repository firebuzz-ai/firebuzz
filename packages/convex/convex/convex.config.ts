import actionRetrier from "@convex-dev/action-retrier/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import { defineApp } from "convex/server";

import workpool from "@convex-dev/workpool/convex.config";

const app = defineApp();

// Aggregate
app.use(aggregate, { name: "aggregateCampaigns" });
app.use(aggregate, { name: "aggregateLandingPages" });
app.use(aggregate, { name: "aggregateLandingPageVersions" });
app.use(aggregate, { name: "aggregateLandingPageTemplates" });
app.use(aggregate, { name: "aggregateMedia" });

// Migrations
app.use(migrations);

// R2
app.use(r2);

// Action Retrier
app.use(actionRetrier);

// Workpools
app.use(workpool, { name: "cascadeOperations" });
app.use(workpool, { name: "batchDeleteStorage" });

export default app;
