'use client'

import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CreditCard, ShoppingBag, User, Mail, Phone, Loader2, Lock, ExternalLink, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import Turnstile from '@/components/ui/Turnstile'

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={<div className="bg-night-950 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>}>
      <CheckoutPage />
    </Suspense>
  )
}

interface LineItem {
  ticketTypeId: string
  quantity: number
  name: string
  price: number
}

function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const eventId = searchParams.get('eventId') ?? ''
  const items: LineItem[] = useMemo(() => {
    try {
      const raw = searchParams.get('items')
      if (!raw) return []
      return JSON.parse(raw) as LineItem[]
    } catch {
      return []
    }
  }, [searchParams])

  const [eventName, setEventName] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [paymentProvider, setPaymentProvider] = useState<'mock' | 'cybersource' | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState<{ discountType: string; discountAmount: number; promoCodeId: string; promoterId: string | null } | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')

  // CyberSource redirect form state
  const [csFormAction, setCsFormAction] = useState('')
  const [csFormParams, setCsFormParams] = useState<Record<string, string>>({})

  // Check for error/success from CyberSource return redirect
  const errorParam = searchParams.get('error')
  useEffect(() => {
    if (errorParam) {
      toast.error(decodeURIComponent(errorParam))
    }
  }, [errorParam])

  // Detect payment provider on mount
  useEffect(() => {
    fetch('/api/payment/session', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setPaymentProvider(data.provider || 'mock')
      })
      .catch(() => {
        setPaymentProvider('mock')
      })
  }, [])

  // Fetch event name on mount
  useEffect(() => {
    if (!eventId) return

    const supabase = createClient()
    supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data) setEventName(data.name)
      })
  }, [eventId])

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  const discountValue = promoDiscount
    ? promoDiscount.discountType === 'percentage'
      ? Math.round(subtotal * promoDiscount.discountAmount / 100)
      : Math.min(promoDiscount.discountAmount, subtotal)
    : 0
  const total = subtotal - discountValue

  // Auto-submit CyberSource form when params are set
  useEffect(() => {
    if (csFormAction && Object.keys(csFormParams).length > 0 && formRef.current) {
      formRef.current.submit()
    }
  }, [csFormAction, csFormParams])

  async function handlePayNow() {
    // Validation
    if (!customerName.trim()) {
      toast.error('Please enter your full name.')
      return
    }
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }
    if (items.length === 0) {
      toast.error('No items in your order.')
      return
    }

    setIsProcessing(true)

    try {
      const idempotencyKey = crypto.randomUUID()

      if (paymentProvider === 'cybersource') {
        // CyberSource Secure Acceptance redirect flow
        const response = await fetch('/api/payment/secure-acceptance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            items: items.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
            })),
            customer: {
              name: customerName.trim(),
              email: customerEmail.trim().toLowerCase(),
              phone: customerPhone.trim() || undefined,
            },
            idempotencyKey,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to prepare payment')
        }

        // Set form action and params to trigger auto-submit
        setCsFormAction(data.checkoutUrl)
        setCsFormParams(data.formParams)
        // Form will auto-submit via useEffect
      } else {
        // Mock payment flow (direct API)
        const paymentToken = 'tok_mock_' + Date.now()

        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            items: items.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              quantity: item.quantity,
            })),
            customer: {
              name: customerName.trim(),
              email: customerEmail.trim().toLowerCase(),
              phone: customerPhone.trim() || undefined,
            },
            paymentToken,
            idempotencyKey,
            turnstileToken: turnstileToken || undefined,
            promoCodeId: promoDiscount?.promoCodeId || undefined,
            promoterId: promoDiscount?.promoterId || undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Checkout failed')
        }

        router.push(`/confirmation?orderId=${data.orderId}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsProcessing(false)
    }
  }

  async function handleApplyPromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError('')
    setPromoDiscount(null)
    try {
      const res = await fetch('/api/checkout/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), eventId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoError(data.error || 'Invalid promo code')
      } else {
        setPromoDiscount(data)
        toast.success('Promo code applied!')
      }
    } catch {
      setPromoError('Failed to validate promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  // If no items, show empty state
  if (items.length === 0) {
    return (
      <div className="bg-night-950 min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 text-night-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Your cart is empty</h1>
          <p className="text-night-400 mb-6">Select tickets from an event to get started.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gold-500 hover:bg-gold-400 text-night-950 font-bold py-3 px-8 rounded-xl transition-colors duration-300"
          >
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-night-950 min-h-screen pb-24">
      {/* Hidden form for CyberSource Secure Acceptance redirect */}
      {csFormAction && (
        <form ref={formRef} method="POST" action={csFormAction} className="hidden">
          {Object.entries(csFormParams).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
          <p className="text-night-400 mt-1">Complete your purchase to secure your tickets.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left column: Order Summary */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-gold-500" />
                <h2 className="text-xl font-bold text-white">Order Summary</h2>
              </div>

              <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6 space-y-5">
                {/* Event name */}
                {eventName && (
                  <div>
                    <p className="text-sm text-night-400">Event</p>
                    <p className="text-white font-semibold">{eventName}</p>
                  </div>
                )}

                <div className="h-px bg-night-800" />

                {/* Line items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.ticketTypeId} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{item.name}</p>
                        <p className="text-night-400 text-sm">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-white font-medium shrink-0 tabular-nums">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Promo Code */}
                <div>
                  <label className="block text-sm text-night-400 mb-1.5">Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      disabled={isProcessing || !!promoDiscount}
                      className="flex-1 bg-night-950 border border-night-700 rounded-lg py-2 px-3 text-white text-sm placeholder:text-night-600 focus:outline-hidden focus:border-gold-500/50 disabled:opacity-50"
                    />
                    {promoDiscount ? (
                      <button
                        type="button"
                        onClick={() => { setPromoDiscount(null); setPromoCode(''); setPromoError('') }}
                        className="px-3 py-2 bg-red-500/10 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="px-3 py-2 bg-gold-500/10 text-gold-400 text-sm rounded-lg hover:bg-gold-500/20 transition-colors disabled:opacity-50"
                      >
                        {promoLoading ? '...' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
                  {promoDiscount && (
                    <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {promoDiscount.discountType === 'percentage' ? `${promoDiscount.discountAmount}% off` : `EGP ${promoDiscount.discountAmount} off`}
                    </p>
                  )}
                </div>

                <div className="h-px bg-night-800" />

                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-night-400">Subtotal</span>
                  <span className="text-white tabular-nums">{formatCurrency(subtotal)}</span>
                </div>

                {discountValue > 0 && (
                  <div className="flex items-center justify-between text-green-400">
                    <span className="text-sm">Discount</span>
                    <span className="tabular-nums">-{formatCurrency(discountValue)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-night-700/50">
                  <span className="text-white font-bold text-lg">Total</span>
                  <span className="text-gold-400 font-bold text-xl tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Customer form + Payment */}
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-6">
            {/* Customer Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gold-500" />
                <h2 className="text-xl font-bold text-white">Your Details</h2>
              </div>

              <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6 space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-night-300 mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
                    <input
                      id="name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      disabled={isProcessing}
                      className="w-full bg-night-950 border border-night-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-night-600 focus:outline-hidden focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-night-300 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
                    <input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isProcessing}
                      className="w-full bg-night-950 border border-night-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-night-600 focus:outline-hidden focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors disabled:opacity-50"
                    />
                  </div>
                  <p className="text-night-500 text-xs mt-1">Your tickets will be sent to this email.</p>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-night-300 mb-1.5">
                    Phone <span className="text-night-600">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
                    <input
                      id="phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+20 xxx xxx xxxx"
                      disabled={isProcessing}
                      className="w-full bg-night-950 border border-night-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-night-600 focus:outline-hidden focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gold-500" />
                <h2 className="text-xl font-bold text-white">Payment</h2>
              </div>

              {paymentProvider === 'cybersource' ? (
                /* CyberSource: card details are entered on CyberSource's hosted page */
                <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6">
                  <div className="flex items-center gap-3 text-night-300">
                    <ExternalLink className="w-5 h-5 text-gold-500 shrink-0" />
                    <div>
                      <p className="text-white font-medium">Secure Payment</p>
                      <p className="text-sm text-night-400 mt-1">
                        You&apos;ll be redirected to our secure payment provider to enter your card details.
                        Your payment information is never stored on our servers.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-night-500 text-xs mt-4 pt-3 border-t border-night-800">
                    <Lock className="w-3 h-3" />
                    <span>256-bit SSL encrypted payment powered by CyberSource</span>
                  </div>
                </div>
              ) : paymentProvider === 'mock' ? (
                /* Mock: show fake card fields */
                <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6 space-y-4">
                  <div>
                    <label htmlFor="card" className="block text-sm font-medium text-night-300 mb-1.5">
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
                      <input
                        id="card"
                        type="text"
                        value="4111111111111111"
                        readOnly
                        className="w-full bg-night-950 border border-night-700 rounded-lg py-3 pl-10 pr-4 text-night-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="expiry" className="block text-sm font-medium text-night-300 mb-1.5">
                        Expiry
                      </label>
                      <input
                        id="expiry"
                        type="text"
                        value="12/28"
                        readOnly
                        className="w-full bg-night-950 border border-night-700 rounded-lg py-3 px-4 text-night-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="cvv" className="block text-sm font-medium text-night-300 mb-1.5">
                        CVV
                      </label>
                      <input
                        id="cvv"
                        type="text"
                        value="123"
                        readOnly
                        className="w-full bg-night-950 border border-night-700 rounded-lg py-3 px-4 text-night-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-night-500 text-xs pt-1">
                    <Lock className="w-3 h-3" />
                    <span>Mock payment provider — no real charges will be made.</span>
                  </div>
                </div>
              ) : (
                /* Loading state while detecting provider */
                <div className="bg-night-900 border border-night-700/50 rounded-xl p-5 sm:p-6 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-night-500" />
                </div>
              )}
            </div>

            {/* Bot Protection */}
            <Turnstile
              onToken={setTurnstileToken}
              onExpired={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />

            {/* Pay Now Button */}
            <button
              type="button"
              onClick={handlePayNow}
              disabled={isProcessing || paymentProvider === null}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-night-950 font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gold-500 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {paymentProvider === 'cybersource' ? 'Redirecting...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Pay {formatCurrency(total)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
