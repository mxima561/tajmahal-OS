# Taj Mahal Tickets

Ticketing platform for **Taj Mahal**, Sharm El Sheikh's premier nightclub. Handles event listings, online ticket sales, QR code entry, VIP reservations, and admin management.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase Auth (invite-only admin accounts)
- **Styling:** Tailwind CSS with custom `night-*` / `gold-*` palettes
- **Payments:** Abstracted provider (mock now, CyberSource planned)
- **QR Codes:** HMAC-SHA256 signed payloads via `qrcode` package
- **Bot Protection:** Cloudflare Turnstile on checkout
- **Email:** Resend (order confirmations)

## Features

**Public:**
- Event listings with ticket type selection
- Checkout with payment processing and bot protection
- Order confirmation with QR code display
- VIP inquiry form

**Admin Dashboard:**
- Event management (create, edit, publish)
- Order tracking and cancellation
- Customer directory with order history
- VIP inquiry review
- Staff management with invite system
- QR code scanner for door check-in

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                   # http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `PAYMENT_PROVIDER` | `mock` or `cybersource` |
| `QR_SIGNING_SECRET` | Secret for HMAC-SHA256 QR code signing |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `RESEND_API_KEY` | Resend email API key |

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check
```

## Project Structure

```
src/
  app/
    (admin)/admin/     # Dashboard, events, orders, customers, VIP, staff
    (public)/          # Events, checkout, confirmation, VIP inquiry, legal pages
    (scanner)/         # Mobile QR scanner for door staff
    api/               # checkout, scanner, vip, admin/*
  components/
    admin/             # AdminSidebar, AdminHeader
    public/            # Navbar, Footer, HeroSection, EventsGrid, VipSection
    ui/                # Turnstile widget
  lib/
    supabase/          # Client, server, middleware helpers
    payments/          # PaymentProvider interface + mock/factory
    qr/                # QR generation and HMAC validation
    email/             # Email service
    utils/             # Formatting helpers
  types/
    database.ts        # Supabase generated types
```
