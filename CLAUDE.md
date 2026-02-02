# Taj Mahal Tickets

Nightclub ticketing platform for Taj Mahal, Sharm El Sheikh, Egypt.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom `night-*` and `gold-*` color palettes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (invite-only admin accounts)
- **Payments**: Abstracted provider (mock now, CyberSource later) — switch via `PAYMENT_PROVIDER` env var
- **QR Codes**: HMAC-SHA256 signed payloads with `qrcode` npm package
- **Email**: Resend (gracefully degrades if API key not set)
- **Bot Protection**: Cloudflare Turnstile (optional, enforced if `TURNSTILE_SECRET_KEY` is set)
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
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
      vip/                 # POST — VIP inquiry submission
      scanner/             # POST — QR verify + check-in
      admin/
        invite/            # POST — create staff account (super_admin only)
        orders/[id]/cancel/# POST — cancel order + tickets
        staff/[id]/        # DELETE — remove staff member (super_admin only)
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
    qr/
      index.ts             # generateQRPayload, validateQRCode, generateQRImage
    email/
      index.ts             # sendOrderConfirmation (Resend API, HTML template)
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
- **Route protection**: Middleware redirects unauthenticated users from `/admin/*` and `/scanner/*` to `/admin/login`. Authenticated users on `/admin/login` redirect to `/admin`.
- **No customer accounts**: Customers are silently linked by email — no registration or login.

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
getPaymentProvider() → MockPaymentProvider | CyberSourceProvider (not yet implemented)
```
- Factory switches on `PAYMENT_PROVIDER` env var
- Mock provider simulates 1.5s delay, rejects `tok_decline` token
- Mock transaction IDs: `MOCK-{timestamp}-{random}`

### Currency
- **EGP only** (Egyptian law requirement)
- Formatted via `Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' })`

### Styling Conventions
- Custom Tailwind color scales: `gold-50` through `gold-900`, `night-50` through `night-950`
- Dark nightclub aesthetic with gold accents
- Utility class `.text-gold-gradient` for gradient text effects
- Custom scrollbar styling for dark theme
- Framer Motion for page transitions and mobile menu animations

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
RESEND_API_KEY                 # Email delivery; if unset, logs to console
NEXT_PUBLIC_TURNSTILE_SITE_KEY # Cloudflare bot protection (client-side)
TURNSTILE_SECRET_KEY           # Cloudflare bot protection (server validation)
NEXT_PUBLIC_SITE_URL           # Site URL (default: http://localhost:3000)
CYBERSOURCE_MERCHANT_ID        # Future: CyberSource payment gateway
CYBERSOURCE_API_KEY_ID
CYBERSOURCE_API_SHARED_SECRET
CYBERSOURCE_FLEX_PUBLIC_KEY
CYBERSOURCE_ENVIRONMENT        # sandbox | production (default: sandbox)
```

## Code Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Server vs client Supabase**: Use `createServerSupabaseClient()` in Server Components/API routes; `createBrowserClient()` on the client. Use `createServiceRoleClient()` only in API routes that need to bypass RLS.
- **API validation**: All API routes validate input with Zod schemas before processing.
- **Error handling**: API routes return `{ error: string }` with appropriate HTTP status codes.
- **Idempotency**: Checkout uses `idempotency_key` to prevent duplicate orders.
- **ESLint**: Extends `next/core-web-vitals` + `next/typescript`. Unused args prefixed with `_` are allowed.
- **TypeScript**: Strict mode enabled. Path resolution via bundler.
- **No tests**: Project has no test framework configured.
