# Taj Mahal Ticketing Platform — Design Document

**Date:** 2026-02-01
**Status:** Approved
**Owner:** Karim / Maxim AI Labs
**Scope:** Taj Mahal venue only (La Dolce Vita ready architecture)

## Overview

Custom ticketing and event management platform for Taj Mahal nightclub in Sharm El Sheikh. Replaces third-party ticketing with a purpose-built system offering lower fees, customer data ownership, and secure QR-based check-in.

## Architecture

Single Next.js 14 app with two zones:

- **Public** (`/`) — Landing, event pages, checkout. SSR, no auth.
- **Admin** (`/admin`) — Dashboard, events, orders, scanner, VIP. Supabase Auth, invite-only.

### Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend + API | Next.js 14 on Vercel | App hosting, edge network |
| Database | Supabase (PostgreSQL) | Data, auth, storage, RLS |
| Payments | CyberSource Flex Microform | PCI-compliant card processing |
| Email | Resend | Transactional email from tickets@tajmahalsharm.com |
| CDN/DNS | Cloudflare | DDoS, SSL, Turnstile CAPTCHA |

### Key Decisions

- **Payment abstraction layer** — Mock provider for demo, CyberSource swapped in via env var
- **Silent customer linking** — No accounts, orders linked by email in `customers` table
- **EGP only** — Egyptian Pound, required by local law
- **Online-first scanner** — Offline-ready architecture, offline mode added later
- **Phone-screen-first QR** — Large, high-contrast QR on confirmation page

## Database Schema

### Tables

- `venues` — Venue info (seeded with Taj Mahal)
- `events` — Events with status (draft/published), cancelled_at timestamp, is_featured flag
- `ticket_types` — Ticket tiers per event (GA, Early Bird, Ladies Night, etc.)
- `customers` — Silent linking by email, tracks order count and total spent
- `orders` — Purchase records with idempotency key, Turnstile verification flag
- `order_items` — Line items per order
- `tickets` — Individual tickets with QR code, HMAC signature, display code
- `vip_inquiries` — VIP contact form submissions
- `admin_users` — Staff accounts linked to Supabase Auth

### Security

- Row Level Security on all tables
- Public read access: venues, published events, ticket types
- Public insert: VIP inquiries only
- All order/ticket creation via service role in API routes
- Admin access gated by `admin_users` table lookup

## Public Pages

### Landing (`/`)
- Dark/gold luxury aesthetic (black background, gold accents)
- Hero with venue image, headline, CTA
- Event card grid (max 6 upcoming)
- VIP section with inquiry CTA
- About/location with map
- Footer with social links

### Event Detail (`/events/[slug]`)
- Banner image, event info, rich description
- Ticket selector with per-type cards, quantity dropdowns
- Low-stock indicator at <20% remaining
- Running total, "Buy Tickets" CTA

### Checkout (`/checkout`)
- Single-page (not multi-step)
- Order summary, guest info, payment (mock/CyberSource), Turnstile, terms
- Confirmation page = the ticket (large QR for phone scanning)

## Admin Pages

- **Dashboard** — Today's events, revenue, recent orders, capacity alerts, VIP count
- **Events** — CRUD with ticket type repeater, image upload, status management
- **Orders** — Filterable list, detail view with ticket statuses, resend/cancel actions, CSV export
- **Customers** — List by spend, detail view with full order history
- **VIP Inquiries** — List with status management, admin notes
- **Scanner** — Camera QR scanner, manual display_code fallback, check-in stats
- **Staff** — Invite-only user management

## Payment Flow

```
Mock Mode:  Fake card form → simulated token → always succeeds → MOCK- prefixed transaction ID
Real Mode:  CyberSource Flex Microform → capture context JWT → tokenize → process via REST API
```

Switch via `PAYMENT_PROVIDER` env var. Same PaymentProvider interface, same checkout UX.

## QR Code Security

**Payload:** `TM:{ticket_id}:{event_id}:{nonce}`
**Signature:** HMAC-SHA256 truncated to 16 hex chars
**Display code:** `TM-A7X9` format for manual fallback

**Validation:** Signature check → ticket exists → correct event → not used → not cancelled → mark used

**Defenses:** HMAC forgery protection, single-use enforcement, server-side validation, nonce prevents enumeration.

## Email Delivery

- Provider: Resend from tickets@tajmahalsharm.com
- SPF, DKIM, DMARC DNS records required
- Email contains inline QR images + PDF attachment as backup
- Branded PDF: black/gold, event details, large QR, display code

## Bot Protection

- Cloudflare Turnstile on checkout (invisible, free)
- Max tickets per order per ticket type
- Rate limiting on API routes

## Build Phases

1. **Foundation** — Project setup, database, admin auth, event CRUD, landing page
2. **Ticketing Core** — Event detail, checkout, mock payments, QR generation, confirmation
3. **Operations** — Email/PDF, scanner, order management, customers, VIP, dashboard, staff
4. **Production** — CyberSource real credentials, performance, security audit, launch
