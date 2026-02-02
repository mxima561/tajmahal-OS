# Security Audit — Taj Mahal Ticketing Platform

**Date**: 2026-02-02
**Scope**: Full application — auth, API routes, payments, QR codes, data handling, resilience

---

## Severity Legend

- **CRITICAL** — Can be exploited to steal money, forge tickets, or take over admin accounts
- **HIGH** — Can cause data corruption, denial of service, or bypass access controls
- **MEDIUM** — Weakens security posture but requires specific conditions to exploit
- **LOW** — Best-practice gap, minor hardening opportunity

---

## 1. CRITICAL: Race Condition in Ticket Availability (Overselling)

**File**: `src/app/api/checkout/route.ts:116-153`

The checkout flow reads `quantity_sold` and `quantity_total`, checks availability, then later increments `quantity_sold` in a separate query (lines 300-312). There is **no row-level locking or atomic decrement**.

**Attack**: Two concurrent checkout requests for the last remaining ticket will both pass the availability check and both succeed — selling more tickets than exist.

```
Request A: reads quantity_sold=99, total=100 → 1 remaining → allows purchase
Request B: reads quantity_sold=99, total=100 → 1 remaining → allows purchase
Request A: sets quantity_sold=100
Request B: sets quantity_sold=100  ← SHOULD BE 101, but overwrites A's update
```

**Impact**: Overselling tickets. Two people show up with valid tickets for one seat.

**Fix**: Use a Postgres atomic update with a WHERE guard:
```sql
UPDATE ticket_types
SET quantity_sold = quantity_sold + $qty
WHERE id = $id AND (quantity_total - quantity_sold) >= $qty
RETURNING id;
```
If zero rows returned, the tickets are sold out. This is atomic and race-safe.

---

## 2. CRITICAL: Admin API Routes Missing Authentication

**File**: `src/app/api/admin/orders/[id]/cancel/route.ts`

This route uses `createServerSupabaseClient()` (anon key, session-based) but **never checks if the caller is an admin**. It only checks if the order exists. Any authenticated Supabase user — or potentially any request if RLS is misconfigured — can cancel any order by ID.

Compare with `src/app/api/admin/invite/route.ts:26-47` which correctly checks `admin_users` role. The cancel route has no equivalent check.

**Impact**: Any authenticated user can cancel arbitrary orders and void tickets.

**Fix**: Add the same admin verification pattern used in the invite and staff routes.

---

## 3. CRITICAL: Scanner API Has No Authentication

**File**: `src/app/api/scanner/route.ts`

The scanner endpoint accepts `verify` and `checkin` actions with **zero authentication**. No session check, no API key, no admin role verification.

**Attack**: Anyone can POST to `/api/scanner` with `{ action: "checkin", ticketId: "<uuid>" }` to check in tickets, or use `verify` to enumerate ticket details (holder names, emails, ticket types).

**Impact**:
- Attacker can check in all tickets before the event, causing chaos at the door
- Ticket holder PII (name, email) is exposed to unauthenticated callers

**Fix**: Require authentication. Either verify a Supabase session + `admin_users` lookup with role `staff` or above, or use a pre-shared scanner API key.

---

## 4. HIGH: No Rate Limiting on Any Endpoint

**Files**: All API routes

No rate limiting exists on any endpoint. This affects:

| Endpoint | Risk |
|----------|------|
| `/api/checkout` | Payment spam, inventory exhaustion |
| `/api/vip` | Spam VIP inquiries, fill database |
| `/api/scanner` | Brute-force ticket codes |
| `/api/admin/invite` | Spam user creation |

**Attack — Scanner brute force**: Display codes are `TM-XXXX` where X is from a 30-char alphabet. That's 30^4 = 810,000 combinations. Without rate limiting, an attacker can enumerate all valid tickets in minutes by calling the verify endpoint.

**Fix**: Add rate limiting via middleware (e.g., `next-rate-limit`, Vercel edge config, or an Upstash Redis-based limiter). Recommended limits:
- `/api/checkout`: 5 req/min per IP
- `/api/vip`: 3 req/min per IP
- `/api/scanner`: 30 req/min per session (authenticated staff only)

---

## 5. HIGH: QR Signature Truncated to 64 Bits

**File**: `src/lib/qr/index.ts:24-28`

The HMAC-SHA256 signature is truncated to the first 16 hex characters (64 bits):
```ts
.digest('hex').substring(0, 16)
```

While 64 bits is impractical to brute-force for a single ticket, it weakens the security margin significantly compared to the full 256 bits. Combined with the lack of rate limiting on the scanner endpoint, an attacker could attempt to forge signatures.

**Fix**: Use at least 32 hex characters (128 bits). QR codes can easily hold the extra data.

---

## 6. HIGH: Idempotency Key Has No Expiration or Scoping

**File**: `src/app/api/checkout/route.ts:79-96`

The idempotency check queries by `idempotency_key` alone with no expiration. Issues:

1. **No user/session scoping**: If an attacker guesses or reuses someone else's idempotency key, they get back that person's order details (order ID, ticket QR codes).
2. **No TTL**: Old idempotency keys stay forever, bloating the table and creating a permanent lookup of all order data.

**Fix**: Scope idempotency keys to the customer email AND add a time window (e.g., 24 hours).

---

## 7. HIGH: Ticket Creation Uses Temporary QR Code with No Uniqueness Constraint

**File**: `src/app/api/checkout/route.ts:267-277`

Tickets are first inserted with a temporary `qr_code` value:
```ts
qr_code: `temp-${Date.now()}-${Math.random()}`
```

If the subsequent QR generation or update fails, the ticket is left in the database with a guessable temporary value. If `qr_code` has a UNIQUE constraint, two near-simultaneous requests could collide on the temp value (same millisecond + `Math.random()` is not cryptographically random).

**Fix**: Generate the real QR payload before insertion. The ticket UUID can be generated client-side (use `crypto.randomUUID()`) so you don't need a database round-trip to get the ID first.

---

## 8. MEDIUM: `quantity_sold` Update is a Read-Then-Write (Non-Atomic)

**File**: `src/app/api/checkout/route.ts:300-312`

```ts
const { data: currentTT } = await supabase
  .from('ticket_types').select('quantity_sold').eq('id', tt.id).single()
// ...
.update({ quantity_sold: (currentTT.quantity_sold || 0) + tt.quantity })
```

This reads the current value and writes back `current + N`. Under concurrency, multiple requests read the same stale value, and the last write wins — losing the count from earlier writes.

**Impact**: `quantity_sold` drifts below the real number, making the system think tickets are still available when they're not (compounds issue #1).

**Fix**: Use Postgres `quantity_sold = quantity_sold + N` via an RPC or raw SQL, not a read-then-write.

---

## 9. MEDIUM: Service Role Key Used in Public-Facing Routes

**Files**: `src/app/api/checkout/route.ts`, `src/app/api/vip/route.ts`, `src/app/api/scanner/route.ts`

These public-facing routes use `createServiceRoleClient()` which bypasses all Row Level Security. This means:
- RLS policies are irrelevant for these routes
- Any bug in the application logic is the only barrier to unauthorized data access
- A single code mistake could expose or mutate any row in any table

**Fix**: For checkout and VIP routes, consider using the anon client with carefully crafted RLS policies that allow inserts from anonymous users only into the specific tables/columns needed. Reserve the service role client for admin-only operations.

---

## 10. MEDIUM: No CSRF Protection on State-Mutating Endpoints

**Files**: All POST API routes

Next.js API routes don't include CSRF tokens by default. The checkout, VIP, scanner, and admin routes all accept POST requests without verifying origin.

**Attack**: A malicious website could embed a form that POSTs to `/api/scanner` with `action: "checkin"` and a known ticket ID, checking in someone's ticket when they visit the attacker's page.

**Mitigation**: The Turnstile token on checkout partially addresses this for that route, but scanner, VIP, and admin routes have no protection. Add `Origin`/`Referer` header validation or implement CSRF tokens.

---

## 11. MEDIUM: Error Messages Leak Internal Details

**File**: `src/app/api/checkout/route.ts:340-344`

```ts
error: `Checkout failed: ${err instanceof Error ? err.message : 'Unknown error'}`
```

Raw error messages from Supabase, payment providers, or Node.js internals are returned directly to the client. This can leak table names, column names, constraint names, or stack traces.

**Fix**: Log the full error server-side, return a generic message to the client.

---

## 12. MEDIUM: No Input Size Limits on Request Bodies

**Files**: All API routes

None of the routes limit the size of the JSON body. An attacker could send a multi-megabyte JSON payload to exhaust server memory.

The checkout `items` array is validated to have `.min(1)` but no `.max()` — an attacker could send thousands of items.

**Fix**: Add `.max(20)` to the items array. Consider adding body size limits in middleware or Next.js config.

---

## 13. LOW: `Math.random()` Used for Security-Adjacent Values

**Files**: `src/lib/utils/format.ts:30,38`, `src/lib/qr/index.ts:19`

`Math.random()` is used for:
- Order number random component
- Display code generation
- QR nonce generation

`Math.random()` is not cryptographically secure. For the QR nonce specifically, this is a concern because predictable nonces could help an attacker forge signatures.

**Fix**: Use `crypto.getRandomValues()` or `crypto.randomBytes()` for the QR nonce. Order numbers and display codes are lower risk but would also benefit.

---

## 14. LOW: No Security Headers

**File**: No `next.config.js` headers or middleware headers found

Missing headers:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `Referrer-Policy`

**Fix**: Add security headers in `next.config.js` or middleware.

---

## 15. LOW: Middleware Only Protects Page Routes, Not API Routes

**File**: `src/lib/supabase/middleware.ts:37-46`

The middleware redirects unauthenticated users away from `/admin/*` and `/scanner/*` **pages**, but API routes under `/api/admin/*` and `/api/scanner` are not covered by this middleware pattern. Each API route must implement its own auth check — and as shown in issues #2 and #3, some don't.

**Fix**: Either extend middleware to reject unauthenticated requests to `/api/admin/*` and `/api/scanner`, or ensure every API route has auth checks (defense in depth: do both).

---

## Summary Table

| # | Severity | Issue | Exploitable Without Auth? |
|---|----------|-------|--------------------------|
| 1 | CRITICAL | Race condition → overselling tickets | Yes |
| 2 | CRITICAL | Order cancel route has no admin check | Yes (with session) |
| 3 | CRITICAL | Scanner API completely unauthenticated | Yes |
| 4 | HIGH | No rate limiting anywhere | Yes |
| 5 | HIGH | QR signature truncated to 64 bits | Yes (with effort) |
| 6 | HIGH | Idempotency key leaks order data | Yes |
| 7 | HIGH | Temp QR codes left on failure | No |
| 8 | MEDIUM | Non-atomic quantity_sold update | Yes |
| 9 | MEDIUM | Service role key in public routes | Indirect |
| 10 | MEDIUM | No CSRF protection | Yes (via victim's browser) |
| 11 | MEDIUM | Error messages leak internals | Yes |
| 12 | MEDIUM | No request body size limits | Yes |
| 13 | LOW | Math.random() for security values | Theoretical |
| 14 | LOW | No security headers | N/A |
| 15 | LOW | Middleware doesn't cover API routes | Indirect |

---

## Recommended Priority Order for Fixes

1. **Immediately**: #3 (scanner auth), #2 (cancel auth), #1 (race condition)
2. **Before launch**: #4 (rate limiting), #9 (service role scope), #8 (atomic updates)
3. **Soon after**: #5 (signature length), #6 (idempotency scoping), #10 (CSRF), #14 (headers)
4. **Hardening**: #7, #11, #12, #13, #15
