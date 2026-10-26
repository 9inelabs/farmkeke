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
import type * as admin_access from "../admin/access.js";
import type * as admin_areas from "../admin/areas.js";
import type * as admin_banners from "../admin/banners.js";
import type * as admin_catalog from "../admin/catalog.js";
import type * as admin_chat from "../admin/chat.js";
import type * as admin_consumers from "../admin/consumers.js";
import type * as admin_dashboard from "../admin/dashboard.js";
import type * as admin_dispatch from "../admin/dispatch.js";
import type * as admin_disputes from "../admin/disputes.js";
import type * as admin_exports from "../admin/exports.js";
import type * as admin_farmerRequests from "../admin/farmerRequests.js";
import type * as admin_farmers from "../admin/farmers.js";
import type * as admin_fees from "../admin/fees.js";
import type * as admin_ledger from "../admin/ledger.js";
import type * as admin_listings from "../admin/listings.js";
import type * as admin_orders from "../admin/orders.js";
import type * as admin_payments from "../admin/payments.js";
import type * as admin_platform from "../admin/platform.js";
import type * as admin_riders from "../admin/riders.js";
import type * as admin_search from "../admin/search.js";
import type * as admin_setup from "../admin/setup.js";
import type * as admin_sitePhotos from "../admin/sitePhotos.js";
import type * as admin_staff from "../admin/staff.js";
import type * as admin_support from "../admin/support.js";
import type * as admin_uploads from "../admin/uploads.js";
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
import type * as lib_bill from "../lib/bill.js";
import type * as lib_codeHash from "../lib/codeHash.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_disputes from "../lib/disputes.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emails from "../lib/emails.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_homeSections from "../lib/homeSections.js";
import type * as lib_listing from "../lib/listing.js";
import type * as lib_listingCounts from "../lib/listingCounts.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_orders from "../lib/orders.js";
import type * as lib_passwordProvider from "../lib/passwordProvider.js";
import type * as lib_paystack from "../lib/paystack.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_phoneAuth from "../lib/phoneAuth.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_reauth from "../lib/reauth.js";
import type * as lib_restock from "../lib/restock.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_shop from "../lib/shop.js";
import type * as lib_sitePhotos from "../lib/sitePhotos.js";
import type * as lib_sms from "../lib/sms.js";
import type * as lib_staffAuth from "../lib/staffAuth.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_validate from "../lib/validate.js";
import type * as lib_wordmarkPng from "../lib/wordmarkPng.js";
import type * as listings from "../listings.js";
import type * as maintenance from "../maintenance.js";
import type * as notifications from "../notifications.js";
import type * as notifications_deliver from "../notifications/deliver.js";
import type * as notifications_staff from "../notifications/staff.js";
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
import type * as phoneAuth from "../phoneAuth.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as shopStats from "../shopStats.js";
import type * as sitePhotos from "../sitePhotos.js";
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
  "admin/access": typeof admin_access;
  "admin/areas": typeof admin_areas;
  "admin/banners": typeof admin_banners;
  "admin/catalog": typeof admin_catalog;
  "admin/chat": typeof admin_chat;
  "admin/consumers": typeof admin_consumers;
  "admin/dashboard": typeof admin_dashboard;
  "admin/dispatch": typeof admin_dispatch;
  "admin/disputes": typeof admin_disputes;
  "admin/exports": typeof admin_exports;
  "admin/farmerRequests": typeof admin_farmerRequests;
  "admin/farmers": typeof admin_farmers;
  "admin/fees": typeof admin_fees;
  "admin/ledger": typeof admin_ledger;
  "admin/listings": typeof admin_listings;
  "admin/orders": typeof admin_orders;
  "admin/payments": typeof admin_payments;
  "admin/platform": typeof admin_platform;
  "admin/riders": typeof admin_riders;
  "admin/search": typeof admin_search;
  "admin/setup": typeof admin_setup;
  "admin/sitePhotos": typeof admin_sitePhotos;
  "admin/staff": typeof admin_staff;
  "admin/support": typeof admin_support;
  "admin/uploads": typeof admin_uploads;
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
  "lib/bill": typeof lib_bill;
  "lib/codeHash": typeof lib_codeHash;
  "lib/counters": typeof lib_counters;
  "lib/disputes": typeof lib_disputes;
  "lib/email": typeof lib_email;
  "lib/emails": typeof lib_emails;
  "lib/geo": typeof lib_geo;
  "lib/homeSections": typeof lib_homeSections;
  "lib/listing": typeof lib_listing;
  "lib/listingCounts": typeof lib_listingCounts;
  "lib/notify": typeof lib_notify;
  "lib/orders": typeof lib_orders;
  "lib/passwordProvider": typeof lib_passwordProvider;
  "lib/paystack": typeof lib_paystack;
  "lib/permissions": typeof lib_permissions;
  "lib/phone": typeof lib_phone;
  "lib/phoneAuth": typeof lib_phoneAuth;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/reauth": typeof lib_reauth;
  "lib/restock": typeof lib_restock;
  "lib/settings": typeof lib_settings;
  "lib/shop": typeof lib_shop;
  "lib/sitePhotos": typeof lib_sitePhotos;
  "lib/sms": typeof lib_sms;
  "lib/staffAuth": typeof lib_staffAuth;
  "lib/uploads": typeof lib_uploads;
  "lib/validate": typeof lib_validate;
  "lib/wordmarkPng": typeof lib_wordmarkPng;
  listings: typeof listings;
  maintenance: typeof maintenance;
  notifications: typeof notifications;
  "notifications/deliver": typeof notifications_deliver;
  "notifications/staff": typeof notifications_staff;
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
  phoneAuth: typeof phoneAuth;
  reviews: typeof reviews;
  seed: typeof seed;
  shopStats: typeof shopStats;
  sitePhotos: typeof sitePhotos;
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
