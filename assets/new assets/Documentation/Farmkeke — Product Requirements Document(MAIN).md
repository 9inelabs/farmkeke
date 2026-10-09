# Farmkeke — Product Requirements Document

Oct 2, 2026 · @Franklyn · Last updated Oct 8, 2026

## Overview & Vision

Farmkeke connects Nigerian farmers directly with households buying fresh produce, removing the intermediaries that raise prices for buyers and shrink margins for farmers.

- Consumers shop on a mobile app or the farmkeke.com website, choosing delivery or pickup
- Farmers apply, list produce and manage orders in the mobile app, reaching buyers through both the app and the website
- Farmkeke holds payment in escrow until the consumer confirms delivery, protecting both sides

## Problem Statement & Goals

Nigeria's produce supply chain runs through several intermediaries, raising prices for households and cutting farmers' margins. Farmers also lack a direct digital channel to reach buyers outside their immediate area.

Goals:

- Lower prices for consumers by removing intermediary markup
- Wider market reach and fairer pricing for farmers
- A trusted payment model that protects both sides
- An experience usable by people with limited smartphone experience

## Target Users & Roles

Three roles use Farmkeke:

| Role | Access | Core actions |
| --- | --- | --- |
| Consumer | Mobile app, website | Browse, guest or registered checkout, track orders, message farmers |
| Farmer | Mobile app (farmer mode) | Apply to sell, list produce, manage orders, message consumers |
| Farmkeke admin | Farmkeke Admin Portal (web) | Approve farmer accounts, oversee orders and accounts platform-wide |

Anyone can apply to become a farmer from the mobile app; Farmkeke admin staff approve or reject each application. Once approved, the same account unlocks farmer mode, and the person can switch between shopping and selling.

## Platforms & Scope

Farmkeke ships as two consumer-facing surfaces and one admin surface:

- Mobile app (iOS and Android, React Native/Expo) — the main shopping experience for consumers, the place to apply as a farmer, and, once approved, the farmer's only tools for products, listings, orders and earnings
- Website (farmkeke.com) — a full e-commerce storefront mirroring the app's shopping experience; farmers who visit it are sent to the app
- Farmkeke Admin Portal (web) — Farmkeke staff manage accounts, farmer approvals, and operations platform-wide

There is no farmer website or Farmer Admin Portal; all farmer work happens in the app.

## Core Features by Platform

Mobile app, consumer side: browsing, search and categories, guest checkout, registered checkout with saved addresses and order history, order tracking, farmer profiles and reviews, in-app messaging, notifications, favorites.

Mobile app, farmer side (farmer mode): apply to become a farmer; once approved, upload products with photos, price, unit and quantity; manage listings and availability; receive orders and update their status; message consumers; manage business details; see earnings; receive farmer notifications. Listings appear on both the app and the website.

Website: the same browsing and checkout experience as the app, including guest checkout. No farmer tools.

## Key User Flows

Two flows define the marketplace: how an order moves from cart to payout, and how a farmer gets approved to sell.

&#91;embedded content: order flow · 6 steps\]

Guest checkout needs no account; a logged-in consumer reuses a saved address at the same step. Either way, the same escrow mechanism protects both sides.

Farmer account requests follow a separate, simpler path:

- Apply in the mobile app (Account → Sell on Farmkeke)
- Farmkeke admin reviews the request in the Farmkeke Admin Portal
- Approved → farmer mode unlocks in the app; produce they list shows on the app and website
- Rejected → the applicant is notified

## Admin System

Farmkeke has one admin surface, the Farmkeke Admin Portal, for Farmkeke's own staff:

- Review and approve or reject farmer account requests
- Oversee all accounts, consumer and farmer, platform-wide
- Visibility into all orders and the ability to intervene in disputes
- Dispatch riders, release escrow, and manage platform settings

Farmers never touch the Farmkeke Admin Portal; they manage their own listings, orders and business details in the app.

## Technical Stack & Architecture

Mobile app: React Native with Expo, TypeScript, Expo Router.

Backend: Convex. One Convex deployment serves the mobile app, the website and the Farmkeke Admin Portal, so every surface reads the same live data.

- Database and server functions: queries for reads, mutations for writes, actions for calls to outside services
- Real-time updates: order status, messages and notifications refresh on screen automatically
- Auth: Convex Auth with password sign-in, plus guest checkout
  - Guest checkout: anyone can buy without an account or sign-in. At checkout they give their name and phone number (email optional), with no SMS code. Their orders are remembered on the phone that placed them, and only that phone can confirm delivery; on another device, Find my order (order number and phone) shows them view-only. After ordering, a guest can save their details as an account, and earlier guest orders are linked to it.
  - Consumers sign up and sign in with email and password
  - Farmers' accounts need a phone number, an email and a password; they sign in with their phone number or email plus password
  - Forgotten passwords are reset by an email link, sent through Resend
  - Sessions are saved on the phone, so users stay signed in after closing the app
  - Farmkeke admin staff sign in with email, password and two-step verification
- File storage: product, profile and application document photos
- Payments: Paystack, called from Convex actions. Paystack's payment webhook arrives at a Convex HTTP endpoint, and escrow status (held, released) lives on the order record.
- Scheduled functions: review reminders, the 24-hour farmer response deadline, and other time-based jobs
- Access control: every server function checks the caller's role (guest, consumer, farmer, Farmkeke admin) before reading or writing

Email: Resend, for all emails across Farmkeke.

Push notifications: EAS Build and Firebase Cloud Messaging. SMS is used for order updates when push is off (SMS provider not yet chosen).

Animation: smooth, purposeful motion across every surface.

- Mobile app: React Native Reanimated (with Gesture Handler), running animations on the native thread. Framer Motion does not run in React Native, so the app does not use it.
- Website and Farmkeke Admin Portal: Framer Motion (now published as the motion package) for page transitions, hover and tap feedback, list and card entrances, and modals.
- Both follow the Motion tokens in the Farmkeke Design System (150, 250 and 350ms durations, ease-out by default) and respect the device's reduce-motion setting.

Website and Farmkeke Admin Portal: stack not yet decided — see Open Questions.

## Brand Identity

Name: Farmkeke — tagline "from the farm directly to your home."

Logo: a shield mark combining a goat-horn silhouette with a leaf, in deep forest green and lime green, with a lowercase wordmark.

Palette, as set in the Farmkeke Design System:

| Color | Hex | Role |
| --- | --- | --- |
| Forest green | #1E3B16 | Brand, key actions, headers |
| Lime | #A9D654 | Accent and highlights |
| White | #FFFFFF | Backgrounds |
| Farmkeke Black | #1A1A1A | Text |
| Success green | #2F9E44 | Completed states |
| Error red | #D64545 | Errors and destructive actions |
| Pending amber | #E6A23C | Waiting and pending states |

The identity is fully green: warm cream and Terracotta are no longer used. Headings use Montserrat and body text uses Inter, as in the Figma designs.

## Open Questions & Decisions Pending

- [x] Exact hex values for the palette — confirmed in the Farmkeke Design System
- [x] Whether Terracotta stays as a secondary accent — no, the identity is fully green
- [ ] Payment provider details — escrow is decided; Paystack integration specifics still pending
- [ ] Payout history breakdown for farmers — on hold pending the above
- [ ] Technology stack for the website and the Farmkeke Admin Portal
- [ ] Farmer commission rate per sale
- [ ] SMS provider for order updates
- [x] Farmer application requirements — government ID, farm photos, proof of address, farmers association letter, and payout bank details
- [x] Guest orders can be linked to an account later, using the same email or phone

## Change Log

| Date | Change |
| --- | --- |
| 2026-10-08 | Farmer Admin Portal removed: farmers apply and work only in the mobile app (farmer mode). Admin systems reduced to the Farmkeke Admin Portal. |
| 2026-10-08 | Auth changed to password sign-in: consumers use email and password; farmers need phone number, email and password; resets by email via Resend. Guest checkout (no account needed) stays and is spelled out under Auth. |
| 2026-10-08 | Palette updated to match the Farmkeke Design System; resolved palette, Terracotta, application requirements and guest order linking questions |
| 2026-10-08 | Farmers now apply in the mobile app instead of the website |
| 2026-10-08 | Added animation stack: Framer Motion on the website and admin portal, Reanimated in the mobile app |
| 2026-10-08 | Backend changed to Convex, shared by the app, website and admin portal |
| 2026-10-02 | Farmers work only in the Farmer Admin Portal; no farmer screens in the mobile app. Escrow payment confirmed as still standing. (Superseded on 2026-10-08) |
| 2026-10-02 | Document created from the initial Farmkeke brief |
