# URL Shortener — Backend

A production-flavored URL shortener with pluggable short-code generation, Redis caching, click analytics, and rate limiting — built with Node.js, Express, MongoDB, and Redis (Upstash).

> This repository contains the **backend**, along with a minimal static frontend served directly from the same Express app. No separate frontend framework or hosting — one server, one origin.

**Live demo:** `<add your Render URL here>`

---

## Features

- **URL shortening** — three interchangeable short-code generation strategies, switchable via config:
  - Random string with collision-check-and-retry
  - Counter-based, base62-encoded, using an atomic Mongo upsert (`findByIdAndUpdate` + `$inc`) to avoid race conditions under concurrent requests
  - [`nanoid`](https://github.com/ai/nanoid), using a cryptographically secure random source instead of `Math.random()`
- **Redis caching (cache-aside)** — `shortCode → longUrl` lookups are cached on read, since the mapping is immutable after creation (never changes, only disappears via delete)
- **Click analytics** — total clicks and per-click history (user agent + timestamp), tracked in a separate collection so the cached URL mapping never needs invalidation on click. Updated fire-and-forget, after the redirect response is already sent, so analytics writes never add latency to a user's redirect
- **Rate limiting** — Redis-backed (`INCR` + conditional `EXPIRE`), race-free by construction, applied per-route via a configurable middleware factory (endpoint name, window, limit)
- **Safe deletion** — idempotent `DELETE`, with cache invalidation deliberately ordered *before* the database delete, so a partial failure fails toward "link still technically resolves" rather than "server claims deleted but a stale cache still serves it"
- **Minimal frontend** — single static page (shorten a link, copy it, check its click count), served by the same Express app

---

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB + Mongoose |
| Cache | Redis, via Upstash (`@upstash/redis`, REST-based client) |
| Short-code generation | Custom (random + base62/counter), `nanoid` |
| Validation | `validator` |
| Frontend | Static HTML/CSS/JS, served via `express.static` |
| Hosting | Render (backend + frontend), MongoDB Atlas, Upstash Redis |



---

## API Reference

All responses follow this shape:
```json
{ "success": true, "message": "...", "data": { } }
```

| Method | Route | Description |
|---|---|---|
| POST | `/shorten` | Create a short link. Body: `{ "longUrl": "..." }`. Rate-limited. |
| GET | `/:shortCode` | Redirect (`302`) to the original URL. Cache-aside on read; increments click analytics in the background. |
| GET | `/totalClicks/:shortCode` | Return total click count for a short code (cached, short TTL). |
| DELETE | `/remove/:shortCode` | Remove a mapping from the database and cache. Idempotent — returns success even if the code never existed. **Not exposed in the frontend; intended for direct API use.** |

---

## Architecture Notes

**Why three generation strategies, not one:** each makes a different tradeoff, and being able to compare them directly was the point.
- *Random + retry* needs a collision check on every generation, but is trivial to reason about.
- *Counter + base62* guarantees no collisions by construction, but is sequential and therefore guessable/enumerable — a real security tradeoff to be aware of, not just a technical curiosity.
- *nanoid* uses a cryptographically secure random source rather than `Math.random()`, so codes aren't just statistically well-distributed, they're unpredictable — relevant if predictable codes are a concern.

**Caching strategy follows directly from the data's actual behavior.** A `shortCode → longUrl` mapping never changes after creation — it only ever disappears, via delete. That means the cache doesn't need time-based invalidation to protect against staleness; the only event that can make a cached entry wrong is deletion, so that's the only place invalidation logic needs to exist.

**Click counts are the opposite case, and cached accordingly.** `totalClicks` mutates on every single click, so it's cached with a short TTL instead of long-lived — a deliberate eventual-consistency tradeoff (the count can lag by up to the TTL window) rather than invalidating on every click, which isn't worth the overhead for a metric that doesn't need to be exact in real time.

**Deletion order matters under partial failure.** Redis keys are invalidated *before* the corresponding MongoDB documents are deleted. If a delete fails partway through, this ordering means the failure leans toward "the link may still resolve" rather than "the server reports success while a stale cache silently keeps serving a supposedly-deleted link" — the safer of the two possible inconsistent states.

**Rate limiting had to account for the hosting platform's proxy chain.** Render sits the app behind infrastructure that doesn't put the real client IP in a simple, single-hop `X-Forwarded-For` entry — the middleware parses the header's leftmost entry (the original-client convention) rather than trusting Express's default `req.ip` resolution, after diagnosing inconsistent IPs being logged for the same physical client.

**Redirects use `302`, not `301`, deliberately.** A `301` is cacheable by browsers/CDNs, which would let clients skip the server entirely on repeat visits — breaking click analytics and making a link's destination effectively unchangeable from the server's side, even though nothing about this app's design assumes that.

---

## Known Limitations / Scope Decisions

These are deliberate choices or known gaps, not accidental bugs:

- **No authentication on `DELETE`** — the route is unauthenticated by design and intentionally left out of the frontend UI. Adding real ownership/auth was out of scope for this pass.
- **No URL normalization** — `longUrl` is matched as an exact string. `https://google.com` and `https://www.google.com` are treated as distinct URLs and get separate short codes. A production system would normalize (protocol/hostname casing, trailing slashes) before matching.
- **Rate limiting is IP-based** — its robustness depends on whether the hosting platform's edge sanitizes client-supplied `X-Forwarded-For` values before appending its own. This hasn't been independently verified beyond observed behavior on Render's free tier.
- **Redis is a single point of failure on the redirect route** — the Redis read and the Mongo fallback currently share one error boundary, so a transient Redis/network failure returns a 500 instead of gracefully falling through to Mongo. A more resilient version would isolate the Redis call in its own try/catch.
- **Free-tier cold starts** — the deployed instance spins down after inactivity; the first request after a while can take up to a couple of minutes.

---

## Getting Started

```bash
git clone <repo-url>
cd backend
npm install
cp .env.example .env   # fill in your own MongoDB URI, Upstash URL/token, etc.
npm run dev
```

Server runs on `http://localhost:<PORT>` (default configurable via `.env`), and also serves the frontend at the same address.

---

## Possible Future Improvements

- Authentication + ownership on links (would unlock a safe, user-facing delete/edit flow)
- URL normalization at write time
- Isolate the Redis read on the redirect route so a cache failure degrades gracefully instead of erroring
- Custom, user-chosen short codes (in addition to generated ones)
- Link expiration
- Automated tests (Jest + Supertest)

---

## Author

Built by Bhunesh as a backend-focused portfolio project.
