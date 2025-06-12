import cache from "@convex-dev/action-cache/convex.config";
import actionRetrier from "@convex-dev/action-retrier/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";

import { defineApp } from "convex/server";

const app = defineApp();

// Aggregate
app.use(aggregate, { name: "aggregateCredits" });
app.use(aggregate, { name: "aggregateCampaigns" });
app.use(aggregate, { name: "aggregateLandingPages" });
app.use(aggregate, { name: "aggregateLandingPageVersions" });
app.use(aggregate, { name: "aggregateLandingPageTemplates" });
app.use(aggregate, { name: "aggregateMedia" });
app.use(aggregate, { name: "aggregateDocuments" });
app.use(aggregate, { name: "aggregateMemoizedDocuments" });
app.use(aggregate, { name: "aggregateTestimonials" });

// Migrations
app.use(migrations);

// R2
app.use(r2);

// Action Retrier
app.use(actionRetrier);

// Action Cache
app.use(cache);

// Workpools
app.use(workpool, { name: "cascadeOperations" });
app.use(workpool, { name: "batchDeleteStorage" });
app.use(workpool, { name: "vectorization" });
app.use(workpool, { name: "summarization" });

// Ratelimit
app.use(rateLimiter);

// Workflow
app.use(workflow);

export default app;
