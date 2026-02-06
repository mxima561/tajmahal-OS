'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { CheckCircle, Ticket, Calendar, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatEventDate } from '@/lib/utils/format';

export default function ConfirmationPageWrapper() {
  return (
    <Suspense fallback={<div className="bg-night-950 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>}>
      <ConfirmationPage />
    </Suspense>
  );
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  events: {
    name: string;
    start_time: string;
  };
}

interface TicketData {
  id: string;
  display_code: string;
  qr_code: string;
  status: string;
  ticket_types: {
    name: string;
  };
}

interface TicketWithQR extends TicketData {
  qr_data_url: string;
}

function ConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [tickets, setTickets] = useState<TicketWithQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    async function fetchOrderData() {
      const supabase = createClient();

      const [orderResult, ticketsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_email, total, events(name, start_time)')
          .eq('id', orderId!)
          .single(),
        supabase
          .from('tickets')
          .select('id, display_code, qr_code, status, ticket_types(name)')
          .eq('order_id', orderId!),
      ]);

      if (orderResult.error) {
        setError('Unable to find your order. Please check your order ID.');
        setLoading(false);
        return;
      }

      if (ticketsResult.error) {
        setError('Unable to load tickets for this order.');
        setLoading(false);
        return;
      }

      setOrder(orderResult.data as unknown as OrderData);

      const ticketsWithQR = await Promise.all(
        (ticketsResult.data as unknown as TicketData[]).map(async (ticket) => {
          const qr_data_url = await QRCode.toDataURL(ticket.qr_code, {
            width: 250,
            margin: 2,
            color: {
              dark: '#D4AF37',
              light: '#0A0A0F',
            },
          });
          return { ...ticket, qr_data_url };
        })
      );

      setTickets(ticketsWithQR);
      setLoading(false);
    }

    fetchOrderData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-night-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-night-700 border-t-gold-500" />
          <p className="text-night-300 text-sm">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-night-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-4">{error || 'Order not found.'}</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-gold-500 px-6 py-3 text-night-950 font-semibold hover:bg-gold-400 transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night-950 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-10">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-gold-500 font-mono text-lg mb-1">{order.order_number}</p>
          <p className="text-night-300 text-sm">
            A confirmation email will be sent to{' '}
            <span className="text-white">{order.customer_email}</span>
          </p>
        </div>

        {/* Event & Order Summary */}
        <div className="rounded-xl border border-night-700 bg-night-900 p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-gold-500 shrink-0" />
            <div>
              <p className="text-white font-semibold">{order.events.name}</p>
              <p className="text-night-300 text-sm">
                {formatEventDate(order.events.start_time)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-night-700 pt-3 mt-3">
            <span className="text-night-300 text-sm">Total Paid</span>
            <span className="text-white font-semibold">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        {/* Tickets */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="h-5 w-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-white">
              Your Tickets ({tickets.length})
            </h2>
          </div>

          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-xl border border-night-700 bg-night-900 p-6 flex flex-col items-center text-center"
              >
                <p className="text-gold-500 font-semibold text-sm uppercase tracking-wider mb-1">
                  {ticket.ticket_types.name}
                </p>
                <p className="text-white font-mono text-2xl tracking-widest mb-4">
                  {ticket.display_code}
                </p>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ticket.qr_data_url}
                  alt={`QR code for ticket ${ticket.display_code}`}
                  width={250}
                  height={250}
                  className="rounded-lg mb-3"
                />

                <p className="text-night-300 text-xs">
                  Show this QR code at the door
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-gold-500 px-8 py-3 text-night-950 font-semibold hover:bg-gold-400 transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
