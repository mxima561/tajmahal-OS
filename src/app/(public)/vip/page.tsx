'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Crown, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const vipSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(6, 'Please enter a valid phone number'),
  partySize: z.number().min(1, 'Party size must be at least 1'),
  message: z.string().optional(),
})

type VipFormData = z.infer<typeof vipSchema>

export default function VipPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VipFormData>({
    resolver: zodResolver(vipSchema),
    defaultValues: {
      partySize: 2,
    },
  })

  async function onSubmit(data: VipFormData) {
    try {
      const res = await fetch('/api/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit inquiry')
    }
  }

  return (
    <div className="bg-night-950 min-h-screen">
      {/* Header */}
      <section className="pt-16 pb-12 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-500/[0.04] rounded-full blur-[120px]" />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 mb-6">
            <Crown className="w-8 h-8 text-gold-500" />
          </div>
          <h1 className="text-gold-gradient text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            VIP Experience
          </h1>
          <p className="text-night-300 text-lg leading-relaxed max-w-lg mx-auto">
            Reserve your exclusive VIP table with dedicated bottle service,
            priority entry, and a private host for an unforgettable night.
          </p>
        </div>
      </section>

      {/* Form / Confirmation */}
      <section className="pb-24 px-4 sm:px-6">
        <div className="mx-auto max-w-xl">
          {submitted ? (
            <div className="bg-night-900 border border-night-700 rounded-2xl p-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-white text-2xl font-bold mb-3">
                Thank you!
              </h2>
              <p className="text-night-300 text-lg">
                We&apos;ll contact you within 24 hours to confirm your VIP reservation.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-night-900 border border-night-700 rounded-2xl p-6 sm:p-8 space-y-6"
            >
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-night-200 mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  {...register('name')}
                  className="w-full bg-night-800 border border-night-700 rounded-lg px-4 py-3 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-night-200 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="w-full bg-night-800 border border-night-700 rounded-lg px-4 py-3 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Phone / WhatsApp */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-night-200 mb-1.5">
                  Phone / WhatsApp
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...register('phone')}
                  className="w-full bg-night-800 border border-night-700 rounded-lg px-4 py-3 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                )}
              </div>

              {/* Party Size */}
              <div>
                <label htmlFor="partySize" className="block text-sm font-medium text-night-200 mb-1.5">
                  Party Size
                </label>
                <input
                  id="partySize"
                  type="number"
                  min={1}
                  placeholder="2"
                  {...register('partySize', { valueAsNumber: true })}
                  className="w-full bg-night-800 border border-night-700 rounded-lg px-4 py-3 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors"
                />
                {errors.partySize && (
                  <p className="mt-1 text-sm text-red-400">{errors.partySize.message}</p>
                )}
              </div>

              {/* Special Requests */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-night-200 mb-1.5">
                  Special Requests <span className="text-night-500">(optional)</span>
                </label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Birthday celebration, preferred seating area, dietary requirements..."
                  {...register('message')}
                  className="w-full bg-night-800 border border-night-700 rounded-lg px-4 py-3 text-white placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-bold text-sm py-3.5 rounded-lg tracking-[0.1em] uppercase transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Inquiry'
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
