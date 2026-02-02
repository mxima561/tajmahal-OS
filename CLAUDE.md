# Taj Mahal Tickets

Nightclub ticketing platform for Taj Mahal, Sharm El Sheikh, Egypt.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom `night-*` and `gold-*` color palettes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (invite-only admin accounts)
- **Payments**: Abstracted provider (mock now, CyberSource later) - switch via `PAYMENT_PROVIDER` env var
- **QR Codes**: HMAC-SHA256 signed payloads with `qrcode` npm package
- **Email**: Resend (not yet configured)

## Project Structure

```
src/
  app/
    (admin)/admin/     # Admin dashboard, events, orders, customers, VIP, scanner, staff
    (public)/          # Public pages: events, checkout, confirmation, VIP inquiry
    api/               # API routes: checkout, vip, scanner, admin/*
  components/
    admin/             # AdminSidebar, AdminHeader
    public/            # Navbar, Footer, HeroSection, EventsGrid, VipSection, etc.
  lib/
    supabase/          # Client, server, middleware helpers
    payments/          # PaymentProvider interface, mock provider, factory
    qr/                # QR generation and validation with HMAC signatures
    utils/             # formatCurrency, formatEventDate, generateOrderNumber, etc.
  types/
    database.ts        # Generated Supabase types + convenience aliases
```

## Key Patterns

- **Admin auth**: Supabase Auth + `admin_users` table lookup. RLS uses simple `auth.uid() = auth_user_id` (no recursive subqueries)
- **Customer linking**: Silent linking by email, no user accounts
- **Currency**: EGP only (Egyptian law requirement)
- **Ticket format**: QR payload = `TM:{ticketId}:{eventId}:{nonce}:{signature}`, display code = `TM-XXXX`
- **Payment abstraction**: `getPaymentProvider()` returns mock or real based on env var

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMENT_PROVIDER` (mock | cybersource)
- `QR_SIGNING_SECRET`

## Supabase Project

- **Project ID**: `epyyeyqvtmgdjjzozrlg`
- **Region**: eu-central-1
- **Tables**: venues, events, ticket_types, customers, admin_users, orders, order_items, tickets, vip_inquiries
