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
import type * as admin_chat from "../admin/chat.js";
import type * as admin_consumers from "../admin/consumers.js";
import type * as admin_dispatch from "../admin/dispatch.js";
import type * as admin_disputes from "../admin/disputes.js";
import type * as admin_farmerRequests from "../admin/farmerRequests.js";
import type * as admin_farmers from "../admin/farmers.js";
import type * as admin_fees from "../admin/fees.js";
import type * as admin_ledger from "../admin/ledger.js";
import type * as admin_listings from "../admin/listings.js";
import type * as admin_orders from "../admin/orders.js";
import type * as admin_payments from "../admin/payments.js";
import type * as admin_platform from "../admin/platform.js";
import type * as admin_riders from "../admin/riders.js";
import type * as admin_staff from "../admin/staff.js";
import type * as admin_support from "../admin/support.js";
import type * as appConfig from "../appConfig.js";
import type * as areas from "../areas.js";
import type * as auth from "../auth.js";
import type * as catalog from "../catalog.js";
import type * as chat from "../chat.js";
import type * as checkout from "../checkout.js";
import type * as crons from "../crons.js";
import type * as disputes from "../disputes.js";
import type * as earnings from "../earnings.js";
import type * as farmerApplications from "../farmerApplications.js";
import type * as farms from "../farms.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as lib_alerts from "../lib/alerts.js";
import type * as lib_application from "../lib/application.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_banks from "../lib/banks.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_disputes from "../lib/disputes.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emails from "../lib/emails.js";
import type * as lib_listing from "../lib/listing.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_orders from "../lib/orders.js";
import type * as lib_passwordProvider from "../lib/passwordProvider.js";
import type * as lib_paystack from "../lib/paystack.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_validate from "../lib/validate.js";
import type * as listings from "../listings.js";
import type * as notifications from "../notifications.js";
import type * as notifications_deliver from "../notifications/deliver.js";
import type * as notifications_store from "../notifications/store.js";
import type * as orders_consumer from "../orders/consumer.js";
import type * as orders_farmer from "../orders/farmer.js";
import type * as orders_system from "../orders/system.js";
import type * as payments_bank from "../payments/bank.js";
import type * as payments_cards from "../payments/cards.js";
import type * as payments_checkout from "../payments/checkout.js";
import type * as payments_config from "../payments/config.js";
import type * as payments_payouts from "../payments/payouts.js";
import type * as payments_processor from "../payments/processor.js";
import type * as payments_refunds from "../payments/refunds.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as storefront from "../storefront.js";
import type * as support from "../support.js";
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
  "admin/chat": typeof admin_chat;
  "admin/consumers": typeof admin_consumers;
  "admin/dispatch": typeof admin_dispatch;
  "admin/disputes": typeof admin_disputes;
  "admin/farmerRequests": typeof admin_farmerRequests;
  "admin/farmers": typeof admin_farmers;
  "admin/fees": typeof admin_fees;
  "admin/ledger": typeof admin_ledger;
  "admin/listings": typeof admin_listings;
  "admin/orders": typeof admin_orders;
  "admin/payments": typeof admin_payments;
  "admin/platform": typeof admin_platform;
  "admin/riders": typeof admin_riders;
  "admin/staff": typeof admin_staff;
  "admin/support": typeof admin_support;
  appConfig: typeof appConfig;
  areas: typeof areas;
  auth: typeof auth;
  catalog: typeof catalog;
  chat: typeof chat;
  checkout: typeof checkout;
  crons: typeof crons;
  disputes: typeof disputes;
  earnings: typeof earnings;
  farmerApplications: typeof farmerApplications;
  farms: typeof farms;
  favorites: typeof favorites;
  http: typeof http;
  "lib/alerts": typeof lib_alerts;
  "lib/application": typeof lib_application;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/banks": typeof lib_banks;
  "lib/counters": typeof lib_counters;
  "lib/disputes": typeof lib_disputes;
  "lib/email": typeof lib_email;
  "lib/emails": typeof lib_emails;
  "lib/listing": typeof lib_listing;
  "lib/notify": typeof lib_notify;
  "lib/orders": typeof lib_orders;
  "lib/passwordProvider": typeof lib_passwordProvider;
  "lib/paystack": typeof lib_paystack;
  "lib/phone": typeof lib_phone;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/settings": typeof lib_settings;
  "lib/uploads": typeof lib_uploads;
  "lib/validate": typeof lib_validate;
  listings: typeof listings;
  notifications: typeof notifications;
  "notifications/deliver": typeof notifications_deliver;
  "notifications/store": typeof notifications_store;
  "orders/consumer": typeof orders_consumer;
  "orders/farmer": typeof orders_farmer;
  "orders/system": typeof orders_system;
  "payments/bank": typeof payments_bank;
  "payments/cards": typeof payments_cards;
  "payments/checkout": typeof payments_checkout;
  "payments/config": typeof payments_config;
  "payments/payouts": typeof payments_payouts;
  "payments/processor": typeof payments_processor;
  "payments/refunds": typeof payments_refunds;
  reviews: typeof reviews;
  seed: typeof seed;
  storefront: typeof storefront;
  support: typeof support;
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
