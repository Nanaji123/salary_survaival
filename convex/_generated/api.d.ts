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
import type * as budgets from "../budgets.js";
import type * as cycles from "../cycles.js";
import type * as expenses from "../expenses.js";
import type * as game from "../game.js";
import type * as gameEngine from "../gameEngine.js";
import type * as gameRules from "../gameRules.js";
import type * as http from "../http.js";
import type * as legalPages from "../legalPages.js";
import type * as lib from "../lib.js";
import type * as plans from "../plans.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  budgets: typeof budgets;
  cycles: typeof cycles;
  expenses: typeof expenses;
  game: typeof game;
  gameEngine: typeof gameEngine;
  gameRules: typeof gameRules;
  http: typeof http;
  legalPages: typeof legalPages;
  lib: typeof lib;
  plans: typeof plans;
  usage: typeof usage;
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
