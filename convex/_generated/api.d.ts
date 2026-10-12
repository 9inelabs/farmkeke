/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as accountsInternal from "../accountsInternal.js";
import type * as addresses from "../addresses.js";
import type * as admin_areas from "../admin/areas.js";
import type * as admin_catalog from "../admin/catalog.js";
import type * as admin_consumers from "../admin/consumers.js";
import type * as admin_farmerRequests from "../admin/farmerRequests.js";
import type * as admin_farmers from "../admin/farmers.js";
import type * as admin_listings from "../admin/listings.js";
import type * as admin_platform from "../admin/platform.js";
import type * as admin_staff from "../admin/staff.js";
import type * as appConfig from "../appConfig.js";
import type * as areas from "../areas.js";
import type * as auth from "../auth.js";
import type * as catalog from "../catalog.js";
import type * as farmerApplications from "../farmerApplications.js";
import type * as farms from "../farms.js";
import type * as http from "../http.js";
import type * as lib_application from "../lib/application.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_banks from "../lib/banks.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_listing from "../lib/listing.js";
import type * as lib_passwordProvider from "../lib/passwordProvider.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_validate from "../lib/validate.js";
import type * as listings from "../listings.js";
import type * as seed from "../seed.js";
import type * as storefront from "../storefront.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  accountsInternal: typeof accountsInternal;
  addresses: typeof addresses;
  "admin/areas": typeof admin_areas;
  "admin/catalog": typeof admin_catalog;
  "admin/consumers": typeof admin_consumers;
  "admin/farmerRequests": typeof admin_farmerRequests;
  "admin/farmers": typeof admin_farmers;
  "admin/listings": typeof admin_listings;
  "admin/platform": typeof admin_platform;
  "admin/staff": typeof admin_staff;
  appConfig: typeof appConfig;
  areas: typeof areas;
  auth: typeof auth;
  catalog: typeof catalog;
  farmerApplications: typeof farmerApplications;
  farms: typeof farms;
  http: typeof http;
  "lib/application": typeof lib_application;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/banks": typeof lib_banks;
  "lib/counters": typeof lib_counters;
  "lib/email": typeof lib_email;
  "lib/listing": typeof lib_listing;
  "lib/passwordProvider": typeof lib_passwordProvider;
  "lib/phone": typeof lib_phone;
  "lib/uploads": typeof lib_uploads;
  "lib/validate": typeof lib_validate;
  listings: typeof listings;
  seed: typeof seed;
  storefront: typeof storefront;
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
