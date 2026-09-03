/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as demo from "../demo.js";
import type * as documents from "../documents.js";
import type * as entities from "../entities.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as investigations from "../investigations.js";
import type * as network from "../network.js";
import type * as patterns from "../patterns.js";
import type * as relationships from "../relationships.js";
import type * as reports from "../reports.js";
import type * as search from "../search.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  audit: typeof audit;
  auth: typeof auth;
  dashboard: typeof dashboard;
  demo: typeof demo;
  documents: typeof documents;
  entities: typeof entities;
  http: typeof http;
  insights: typeof insights;
  investigations: typeof investigations;
  network: typeof network;
  patterns: typeof patterns;
  relationships: typeof relationships;
  reports: typeof reports;
  search: typeof search;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
