import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-landingpages",
  { hours: 12 },
  internal.collections.landingPages.utils.deleteCleanup,
  {
    numItems: 100,
  }
);

crons.interval(
  "cleanup-campaigns",
  { hours: 12 },
  internal.collections.campaigns.utils.deleteCleanup,
  {
    numItems: 100,
  }
);

export default crons;
