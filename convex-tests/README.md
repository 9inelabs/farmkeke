# Backend tests

End-to-end tests of the Convex backend in `../convex`, run with convex-test. They exercise:
- money flows: escrow, refunds, payouts and commission
- the order lifecycle and its timeouts
- chat, disputes, reviews, notifications, support and account deletion
- every transactional email: shop status changes, message throttling, account security emails, farm emails and their defaults, the wordmark route
- storefront search, filters and stats

```
cd convex-tests
npm ci        # first time only
npm test
```

They run fully offline against an in-memory backend and never touch the live deployment. The repo root needs its `node_modules` (`npm ci` at the root).
