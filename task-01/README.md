# Task 01 — POS Order & Inventory System

Concurrency-safe backend (Node/Express/Mongoose) + React (Vite) frontend.

## Live URLs
- Backend: TODO — fill in after Railway deploy
- Frontend: TODO — fill in after Railway deploy

## Tech stack
Node.js, Express, MongoDB (Atlas) via Mongoose, React 18 (Vite), plain CSS.

## Folder structure
```
task-01/
  backend/   Express API, atomic stock reservation, mock payments, order state machine
  frontend/  React UI: product catalog + cart + checkout, order history
```

## Setup — backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGODB_URI to an Atlas connection string (needs to be a
# replica set for transactions — the Atlas free tier already is one)
npm run dev
# runs on http://localhost:5001
```

## Setup — frontend
```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:5001
npm run dev
# runs on http://localhost:5173
```

## How to test each feature

**Product CRUD** — add a product via the form on the Products page; delete via the card's Delete button.

**Add to cart / checkout** — click "Add to cart" on any product, then "Checkout (reserve stock)" in the cart panel. This calls `POST /api/orders`, which atomically decrements stock and creates a `Reserved` order — stock will visibly drop on the product list.

**Concurrency / no overselling** — set a product's stock low (e.g. 1), then fire several checkout requests at it in parallel:
```bash
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:5001/api/orders \
    -H "Content-Type: application/json" \
    -d '{"items":[{"productId":"<id>","quantity":1}],"idempotencyKey":"test-'$i'"}' &
done; wait
```
Exactly one should succeed with a `201`; the rest return `409 Insufficient stock`.

**Reservation expiry (5 min)** — checkout an item and leave it Reserved without paying. After 5 minutes the background job (polls every 30s) flips it to `Expired` and stock reappears on the Products page. To test faster, temporarily set `RESERVATION_TTL_MINUTES=1` in the backend `.env`.

**Payment outcomes** — click "Pay now" in the checkout panel (or "Pay" on the Orders page) repeatedly across different orders; outcomes are randomised (60% success / 25% failure / 15% timeout) so you'll see all three within a few attempts. Success → `Paid`. Failure → stock released, order `Failed`. Timeout → order stays `Reserved`, retry Pay or let it expire.

**Duplicate submission handling** — resend the exact same checkout request (same `idempotencyKey`) — it returns the original order instead of creating a second reservation. Calling Pay on an already-`Paid`/`Failed`/`Cancelled` order returns `409`.

**Order lifecycle / cancellation** — on the Orders page, Cancel a `Reserved` or `Paid` order; stock is restored either way, and status becomes `Cancelled`. Invalid transitions (e.g. cancelling an already-`Cancelled` order) are rejected with `409`.

## Notes
No auth is implemented — out of scope for this assessment. Payment is fully mocked; no real gateway is called.
