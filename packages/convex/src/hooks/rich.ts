import { useQueries } from "convex/react";
import { makeUseQueryWithStatus } from "convex-helpers/react";
import { useQueries as useCachedQueries } from "convex-helpers/react/cache/hooks";

const useCachedRichQuery = makeUseQueryWithStatus(useCachedQueries);
const useRichQuery = makeUseQueryWithStatus(useQueries);
export { useCachedRichQuery, useRichQuery };
