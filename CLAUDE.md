# Taj Mahal Tickets

Nightclub ticketing platform for Taj Mahal, Sharm El Sheikh, Egypt.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4 with CSS-first config and custom `night-*` and `gold-*` color palettes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (invite-only admin accounts)
- **Payments**: Abstracted provider (mock now, CyberSource WIP) — switch via `PAYMENT_PROVIDER` env var
- **QR Codes**: HMAC-SHA256 signed payloads with `qrcode` npm package
- **Email**: Resend (gracefully degrades if API key not set)
- **Bot Protection**: Cloudflare Turnstile (optional, enforced if `TURNSTILE_SECRET_KEY` is set)
- **Forms**: React Hook Form + Zod validation
- **Animations**: Motion (formerly Framer Motion) — import from `motion/react`
- **Icons**: Lucide React
- **Notifications**: Telegram Bot API for VIP inquiry alerts

## Version Matrix

| Package | Version |
|---------|---------|
| Next.js | 16.1.6 |
| React | 19.2.4 |
| Tailwind CSS | 4.1.18 |
| ESLint | 9.39.2 |
| Motion | 12.33.0 |
| TypeScript | 5.x |
| @supabase/supabase-js | 2.95.2 |
| @supabase/ssr | 0.8.0 |
| Zod | 4.3.6 |

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint (flat config)
npx tsc --noEmit     # Type check only
```

There are no tests configured. No CI/CD pipelines exist yet.

## Project Structure

```
src/
  app/
    (public)/              # Public-facing pages
      events/[slug]/       # Event detail with ticket selector
      checkout/            # Checkout flow
      confirmation/        # Order confirmation with QR codes
      vip/                 # VIP inquiry form
      privacy/             # Legal pages
      terms/
      refund-policy/
    (admin)/admin/         # Admin dashboard (auth-protected)
      login/               # Admin login
      events/              # CRUD: list, new, [id]/edit
      orders/              # List + [id] detail
      customers/           # List + [id] detail
      vip/                 # List + [id] detail with notes
      scanner/             # Redirect to scanner zone
      staff/               # Staff management
    (scanner)/scanner/     # Mobile QR scanner (auth-protected, standalone layout)
    api/
      checkout/            # POST — full checkout flow
      vip/                 # POST — VIP inquiry submission + Telegram notification
      scanner/             # POST — QR verify + check-in
      admin/
        invite/            # POST — create staff account (super_admin only)
        orders/[id]/cancel/# POST — cancel order + tickets
        orders/delete/     # POST — delete orders (admin)
        staff/[id]/        # DELETE — remove staff member (super_admin only)
      payment/             # CyberSource Secure Acceptance (WIP)
        secure-acceptance/ # POST — generate SA form data
        return/            # GET/POST — SA redirect handler
  components/
    admin/                 # AdminSidebar, AdminHeader
    public/                # Navbar, Footer, HeroSection, EventsGrid, TicketSelector,
                           # VipSection, LocationSection
    ui/                    # Turnstile (Cloudflare CAPTCHA widget)
  lib/
    supabase/
      client.ts            # Browser Supabase client (createBrowserClient)
      server.ts            # Server client + service role client (bypasses RLS)
      middleware.ts         # Session refresh + route protection logic
    payments/
      types.ts             # PaymentProvider interface (processPayment, refundPayment)
      index.ts             # Factory: getPaymentProvider() switches on env var
      mock.ts              # MockPaymentProvider (1.5s delay, tok_decline = fail)
      cybersource.ts       # CyberSourceProvider (WIP — Secure Acceptance flow)
    qr/
      index.ts             # generateQRPayload, validateQRCode, generateQRImage
    email/
      index.ts             # sendOrderConfirmation (Resend API, HTML template)
    telegram.ts            # sendTelegramNotification (VIP inquiry alerts)
    utils/
      format.ts            # formatCurrency, formatEventDate/Time, generateOrderNumber,
                           # generateDisplayCode, generateSlug
  types/
    database.ts            # Supabase generated types + convenience aliases
  middleware.ts            # Next.js middleware entry point (delegates to lib/supabase/middleware)
```

## Key Patterns

### Authentication & Authorization
- **Admin auth**: Supabase Auth + `admin_users` table lookup. RLS uses `auth.uid() = auth_user_id` (no recursive subqueries).
- **Roles**: `super_admin`, `manager`, `staff`. Only super_admin can invite/delete staff.
- **Route protection**: Middleware redirects unauthenticated users from `/admin/*` and `/scanner/*` to `/admin/login`. Middleware also verifies user exists in `admin_users` table before granting access. Authenticated users on `/admin/login` redirect to `/admin`.
- **Login rate limiting**: Login attempts are rate limited to 5 per minute per IP via `/api/auth/login`.
- **No customer accounts**: Customers are silently linked by email — no registration or login.

### Next.js 16 Async APIs
- All `params` and `searchParams` in pages, layouts, and route handlers are `Promise<>` types that must be `await`ed.
- Example: `{ params }: { params: Promise<{ id: string }> }` then `const { id } = await params`
- Server-side `cookies()` and `headers()` are also async and already awaited in this codebase.

### Checkout Flow (`POST /api/checkout`)
1. Validate Turnstile token (if secret key configured)
2. Idempotency check (return existing order if key matches)
3. Verify event is published and ticket availability
4. Process payment via `PaymentProvider`
5. Upsert customer by email
6. Create order + order_items + individual tickets with QR codes
7. Update `quantity_sold` counters
8. Send confirmation email (fire-and-forget)

### QR Code System
- **Payload format**: `TM:{ticketId}:{eventId}:{nonce}:{signature}`
- **Nonce**: 4-char alphanumeric (excludes ambiguous chars: 0, 1, I, L, O)
- **Signature**: First 16 chars of HMAC-SHA256(`QR_SIGNING_SECRET`, payload)
- **Display code**: `TM-XXXX` (human-readable, for manual entry)
- **Scanner supports both**: QR scan (validates signature) and manual display code lookup

### Payment Abstraction
```
getPaymentProvider() → MockPaymentProvider | CyberSourceProvider
```
- Factory switches on `PAYMENT_PROVIDER` env var (`mock` | `cybersource`)
- Mock provider simulates 1.5s delay, rejects `tok_decline` token
- CyberSource provider uses Secure Acceptance Hosted Checkout (redirect flow, WIP)
- CyberSource refunds via REST API with HMAC-SHA256 signed requests

### Currency
- **EGP only** (Egyptian law requirement)
- Formatted via `Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' })`

### Styling Conventions
- **Tailwind 4 CSS-first config**: Colors defined in `@theme` block in `globals.css` (no `tailwind.config.ts`)
- Custom color scales: `gold-50` through `gold-900`, `night-50` through `night-950`
- Dark nightclub aesthetic with gold accents
- Utility class `.text-gold-gradient` for gradient text effects
- Custom scrollbar styling for dark theme
- Motion library (`motion/react`) for page transitions and mobile menu animations

### ESLint Configuration
- **ESLint 9 flat config** in `eslint.config.mjs`
- Extends `eslint-config-next` (native flat config array export)
- Custom rule: unused args prefixed with `_` are allowed (`argsIgnorePattern: "^_"`)

## Database Schema

**Supabase Project**: `epyyeyqvtmgdjjzozrlg` (eu-central-1)

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `venues` | Venue info | name, slug, address, lat/lng |
| `events` | Event listings | venue_id FK, status (draft/published), capacity, dates |
| `ticket_types` | Ticket tiers per event | event_id FK, price, quantity_total/sold, max_per_order |
| `customers` | Customer directory | email (unique key), totals aggregation |
| `orders` | Purchase records | event_id FK, customer_id FK, payment status, idempotency_key |
| `order_items` | Line items | order_id FK, ticket_type_id FK, quantity, pricing |
| `tickets` | Individual tickets | order_id FK, qr_code, qr_signature, display_code, status (valid/used/cancelled) |
| `vip_inquiries` | VIP requests | venue_id FK, status (new/contacted/converted) |
| `admin_users` | Staff accounts | auth_user_id, role (super_admin/manager/staff), venue_access |

### Type Aliases (in `src/types/database.ts`)
```typescript
Venue, Event, TicketType, Customer, AdminUser, Order, OrderItem, Ticket, VipInquiry
EventWithTicketTypes  // Event & { ticket_types: TicketType[] }
OrderWithDetails      // Order & { order_items, tickets, event, customer }
```

## Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key (public)
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server-only, bypasses RLS)
PAYMENT_PROVIDER               # mock | cybersource
QR_SIGNING_SECRET              # HMAC secret for QR code signatures
```

### Optional
```
CONFIRMATION_TOKEN_SECRET      # HMAC secret for confirmation page tokens (isolated from QR)
RESEND_API_KEY                 # Email delivery; if unset, logs to console
NEXT_PUBLIC_TURNSTILE_SITE_KEY # Cloudflare bot protection (client-side)
TURNSTILE_SECRET_KEY           # Cloudflare bot protection (server validation)
NEXT_PUBLIC_SITE_URL           # Site URL (default: http://localhost:3000)
TELEGRAM_BOT_TOKEN             # Telegram bot for VIP inquiry notifications
TELEGRAM_CHAT_ID               # Telegram group/chat for VIP alerts
UPSTASH_REDIS_REST_URL         # Upstash Redis for rate limiting (optional, falls back to in-memory)
UPSTASH_REDIS_REST_TOKEN       # Upstash Redis token
```

### CyberSource (WIP)
```
CYBERSOURCE_MERCHANT_ID        # CyberSource merchant ID
CYBERSOURCE_ACCESS_KEY         # Secure Acceptance access key
CYBERSOURCE_SECRET_KEY         # Secure Acceptance signing secret
CYBERSOURCE_PROFILE_ID         # Secure Acceptance profile ID
CYBERSOURCE_ENVIRONMENT        # sandbox | production (default: sandbox)
```

## Code Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Server vs client Supabase**: Use `createServerSupabaseClient()` in Server Components/API routes; `createBrowserClient()` on the client. Use `createServiceRoleClient()` only in API routes that need to bypass RLS.
- **API validation**: All API routes validate input with Zod schemas before processing.
- **Error handling**: API routes return `{ error: string }` with appropriate HTTP status codes. User-facing error messages are sanitized (no internal details leaked).
- **Idempotency**: Checkout uses `idempotency_key` to prevent duplicate orders.
- **ESLint**: Flat config (`eslint.config.mjs`). Unused args prefixed with `_` are allowed.
- **TypeScript**: Strict mode enabled. Path resolution via bundler.
- **Animations**: Import from `motion/react` (not `framer-motion`).
- **Security headers**: Configured in `next.config.mjs` (X-Frame-Options, X-Content-Type-Options, HSTS, CSP, Referrer-Policy, Permissions-Policy)
- **Audit logging**: Admin actions logged to `audit_logs` table via `logAuditEvent()` helper
- **File upload validation**: Magic byte validation (not just MIME type) for image uploads
- **Error sanitization**: Zod validation details hidden in production via `formatZodError()` helper
- **No tests**: Project has no test framework configured.
