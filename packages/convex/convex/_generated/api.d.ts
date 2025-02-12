/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as collections_projects from "../collections/projects.js";
import type * as collections_users from "../collections/users.js";
import type * as collections_workspace from "../collections/workspace.js";
import type * as http from "../http.js";
import type * as triggers from "../triggers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "collections/projects": typeof collections_projects;
  "collections/users": typeof collections_users;
  "collections/workspace": typeof collections_workspace;
  http: typeof http;
  triggers: typeof triggers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
