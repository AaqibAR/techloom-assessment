# Task 02 — E-commerce Checkout & Payment System

Node/Express/Mongoose backend + React (Vite) storefront. Shares the same concurrency-safe reservation core as Task 01, extended with product search/filtering, refunds, and per-user order history.

## Live URLs
- Backend: https://tltask2backend-production.up.railway.app
- Frontend: https://tltask2frontend-production.up.railway.app

## Tech stack
Node.js, Express, MongoDB (Atlas) via Mongoose, React 18 (Vite), plain CSS.

## Folder structure
```
task-02/
  backend/   Express API: product discovery, checkout/reservation, mock payments, refunds
  frontend/  React storefront: search/filter, product detail, cart, order history
```

## Setup — backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGODB_URI to an Atlas connection string (needs to be a
# replica set for transactions — the Atlas free tier already is one).
# Use a different database name than Task 01 (e.g. techloom-task02) so the
# two don't collide if you point them at the same cluster.
npm run dev
# runs on http://localhost:5002 (different port from Task 01's 5001 so both can run together)
```

## Setup — frontend
```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:5002
npm run dev
# runs on http://localhost:5174 (different port from Task 01's 5173)
```

## How to test each feature

**Product discovery / search & filter** — use the search box, category dropdown, min/max price, and "In stock only" checkbox on the Shop page; results update automatically. Click a product's name to open its detail view.

**Cart & checkout with reservation** — add items to cart, click "Checkout (reserve stock)". This calls `POST /api/orders`, atomically reserving stock and creating a `Reserved` order — watch the product's stock drop.

**Mock payment gateway** — click "Pay now" repeatedly across different orders; outcomes are randomised (60% success / 25% failure / 15% timeout). Success → `Paid`, stock stays deducted. Failure → stock released, order `Failed`. Timeout → stays `Reserved`, retry or let it expire.

**Duplicate payment/order prevention** — resending the same checkout request (same `idempotencyKey`) returns the original order rather than creating a second one. Calling Pay on a non-`Reserved` order returns `409`.

**Cancellation & refund** — on Order History, Cancel a `Reserved` or `Paid` order; stock is restored either way. If the order had already been `Paid`, cancellation automatically simulates a refund (visible in the Refund column). A manual "Refund" button also appears for any cancelled-but-unrefunded paid order, calling `POST /orders/:id/refund` — idempotent, safe to click twice.

**Order history** — the Order History page lists only this browser's orders (a random id is generated once and stored in `localStorage` — no auth is in scope for this assessment) and auto-refreshes every 5 seconds.

**Reservation expiry (5 min)** — same background job as Task 01: leave a `Reserved` order unpaid and it flips to `Expired` after the TTL, releasing stock. Set `RESERVATION_TTL_MINUTES=1` in `.env` to test faster.

## Notes
No real auth or payment provider is used — `userId` is a client-generated browser identifier, and payment/refunds are fully simulated. A `Failed` order was never actually charged, so it isn't refund-eligible — only orders that reached `Paid` and were then cancelled can be refunded.
