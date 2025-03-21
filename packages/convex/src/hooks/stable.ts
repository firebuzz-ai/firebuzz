import { usePaginatedQuery } from "convex/react";
import { useRef } from "react";
import type { Doc } from "../nextjs";
import { useCachedQuery } from "./cached";

/**
 * Drop-in replacement for useQuery intended to be used with a parametrized query.
 * Unlike useQuery, useStableQuery does not return undefined while loading new
 * data when the query arguments change, but instead will continue to return
 * the previously loaded data until the new data has finished loading.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 *
 * @param name - string naming the query function
 * @param ...args - arguments to be passed to the query function
 * @returns UseQueryResult
 */
export const useStableCachedQuery = ((name, ...args) => {
  const result = useCachedQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // result is only undefined while data is loading
  // if a freshly loaded result is available, use the ref to store it
  if (result !== undefined) {
    stored.current = result;
  }

  // undefined on first load, stale data while loading, fresh data after loading
  return stored.current;
}) as typeof useCachedQuery;

/**
 * Drop-in replacement for usePaginatedQuery for use with a parametrized query.
 * Unlike usePaginatedQuery, when query arguments change useStablePaginatedQuery
 * does not return empty results and 'LoadingMore' status. Instead, it continues
 * to return the previously loaded results until the new results have finished
 * loading.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 *
 * @param name - string naming the query function
 * @param ...args - arguments to be passed to the query function
 * @returns UsePaginatedQueryResult
 */
export const useStablePaginatedQuery = ((name, ...args) => {
  const result = usePaginatedQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // If data is still loading, wait and do nothing
  // If data has finished loading, store the result
  if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
    stored.current = result;
  }

  return stored.current;
}) as typeof usePaginatedQuery;

export const useStableReversedPaginatedMessagesQuery = ((name, ...args) => {
  const result = useStablePaginatedQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // If data is still loading, wait and do nothing
  // If data has finished loading, store the result
  if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
    stored.current = result;
  }

  // IMPORTANT: Must initialize all hooks unconditionally before any early returns
  // Avoid recomputing on every render
  const processed = useRef<{
    source: Doc<"landingPageMessages">[];
    result: Doc<"landingPageMessages">[];
  }>({ source: [], result: [] });

  // IMPORTANT: We must memoize sorted results
  // to avoid infinite re-renders from object identity changes
  const typeCorrectedResults = stored.current
    .results as Doc<"landingPageMessages">[];

  // Early return after all hooks are initialized
  if (!typeCorrectedResults || typeCorrectedResults.length === 0) {
    return stored.current;
  }

  // Only recompute when the source data changes
  if (
    processed.current.source !== typeCorrectedResults &&
    Array.isArray(typeCorrectedResults)
  ) {
    try {
      const groupedResults = typeCorrectedResults
        .sort((a, b) => a._creationTime - b._creationTime)
        .reduce(
          (acc, result) => {
            const groupId = result.groupId;
            if (!acc[groupId]) {
              acc[groupId] = [];
            }
            acc[groupId].push(result);
            return acc;
          },
          {} as Record<string, typeof stored.current.results>
        );

      const sortedResults = Object.values(groupedResults).flatMap((group) =>
        group.sort((a, b) => {
          // Safely handle date conversion
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        })
      );

      processed.current = {
        source: typeCorrectedResults,
        result: sortedResults,
      };
    } catch (error) {
      console.error("Error processing messages:", error);
      processed.current = {
        source: typeCorrectedResults,
        result: typeCorrectedResults,
      };
    }
  }

  return {
    ...stored.current,
    results: processed.current.result,
  };
}) as typeof useStablePaginatedQuery;
