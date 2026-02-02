'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Search, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Event = {
  id: string
  name: string
  start_time: string
  status: string
}

type TicketInfo = {
  id: string
  display_code: string
  status: string
  checked_in_at: string | null
  holder_name: string
  holder_email: string
  ticket_type: string
}

type ScanResult = {
  result: 'valid' | 'already_used' | 'invalid'
  message?: string
  ticket?: TicketInfo
} | null

export default function ScannerPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [qrInput, setQrInput] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult>(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Fetch published events
  useEffect(() => {
    async function fetchEvents() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_time, status')
        .eq('status', 'published')
        .order('start_time', { ascending: false })

      if (error) {
        toast.error('Failed to load events')
        console.error('Error fetching events:', error)
        return
      }

      setEvents(data || [])
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    }

    fetchEvents()
  }, [])

  const resetScanner = useCallback(() => {
    setScanResult(null)
    setManualCode('')
    setQrInput('')
    setShowSuccess(false)
    // Re-focus the QR input for rapid scanning
    setTimeout(() => {
      qrInputRef.current?.focus()
    }, 100)
  }, [])

  async function verifyCode(code: string) {
    if (!code.trim() || !selectedEventId) return

    setLoading(true)
    setScanResult(null)

    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: code.trim(),
          eventId: selectedEventId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Verification failed')
        setScanResult({ result: 'invalid', message: data.error || 'Verification failed' })
        return
      }

      setScanResult(data)
    } catch {
      toast.error('Network error — could not reach server')
      setScanResult({ result: 'invalid', message: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckin(ticketId: string) {
    setCheckingIn(true)

    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          ticketId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Check-in failed')
        return
      }

      setShowSuccess(true)
      setTimeout(() => {
        resetScanner()
      }, 2000)
    } catch {
      toast.error('Network error — could not check in')
    } finally {
      setCheckingIn(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    verifyCode(manualCode)
  }

  function handleQrInput(value: string) {
    setQrInput(value)
    // QR scanners typically paste the full value followed by an Enter.
    // We auto-submit if the input looks like a complete QR payload (contains colons).
    if (value.includes(':') && value.split(':').length >= 5) {
      verifyCode(value)
    }
  }

  function handleQrKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      verifyCode(qrInput)
    }
  }

  function formatCheckinTime(isoString: string): string {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <QrCode className="w-7 h-7 text-gold-500" />
        <h1 className="text-2xl font-bold">Check-in Scanner</h1>
      </div>

      {/* Event Selector */}
      <div className="bg-night-900 border border-night-700 rounded-xl p-4">
        <label className="block text-sm font-medium text-night-300 mb-2">
          Active Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEventId(e.target.value)
            resetScanner()
          }}
          className="w-full bg-night-800 border border-night-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
        >
          {events.length === 0 && (
            <option value="">No published events</option>
          )}
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} — {new Date(event.start_time).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Input Methods */}
      {selectedEventId && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Manual Entry */}
          <div className="bg-night-900 border border-night-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-night-400" />
              <span className="text-sm font-medium text-night-300">Manual Entry</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="TM-XXXX"
                className="flex-1 bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 uppercase tracking-wider"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
              </button>
            </form>
          </div>

          {/* QR Scan Input */}
          <div className="bg-night-900 border border-night-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-night-400" />
              <span className="text-sm font-medium text-night-300">QR Scan</span>
            </div>
            <input
              ref={qrInputRef}
              type="text"
              value={qrInput}
              onChange={(e) => handleQrInput(e.target.value)}
              onKeyDown={handleQrKeyDown}
              placeholder="Scan QR code or paste data..."
              className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-night-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              disabled={loading}
              autoFocus
            />
            <p className="mt-2 text-xs text-night-500">
              Focus this field, then scan. Auto-verifies on scan.
            </p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
        </div>
      )}

      {/* Success Confirmation */}
      {showSuccess && (
        <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-8 text-center animate-pulse">
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
          <p className="text-2xl font-bold text-green-400">Checked In!</p>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && !loading && !showSuccess && (
        <div>
          {/* Valid Ticket */}
          {scanResult.result === 'valid' && scanResult.ticket && (
            <div className="bg-green-500/10 border-2 border-green-500 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-green-400">Valid Ticket</p>
                  <p className="text-sm text-green-300/70">{scanResult.ticket.display_code}</p>
                </div>
              </div>

              <div className="bg-night-900/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-night-400">Name</span>
                  <span className="text-sm font-medium text-white">
                    {scanResult.ticket.holder_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-night-400">Email</span>
                  <span className="text-sm text-night-300">
                    {scanResult.ticket.holder_email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-night-400">Ticket Type</span>
                  <span className="text-sm font-medium text-gold-400">
                    {scanResult.ticket.ticket_type}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleCheckin(scanResult.ticket!.id)}
                disabled={checkingIn}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg"
              >
                {checkingIn ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  'Tap to Check In'
                )}
              </button>

              <button
                onClick={resetScanner}
                className="w-full text-night-400 hover:text-night-200 text-sm py-2 transition-colors"
              >
                Cancel &amp; scan next
              </button>
            </div>
          )}

          {/* Already Used */}
          {scanResult.result === 'already_used' && (
            <div className="bg-amber-500/10 border-2 border-amber-500 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-10 h-10 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-amber-400">Already Checked In</p>
                  {scanResult.ticket?.checked_in_at && (
                    <p className="text-sm text-amber-300/70">
                      Checked in at {formatCheckinTime(scanResult.ticket.checked_in_at)}
                    </p>
                  )}
                </div>
              </div>

              {scanResult.ticket && (
                <div className="bg-night-900/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-night-400">Code</span>
                    <span className="text-sm font-medium text-white">
                      {scanResult.ticket.display_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-night-400">Name</span>
                    <span className="text-sm font-medium text-white">
                      {scanResult.ticket.holder_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-night-400">Ticket Type</span>
                    <span className="text-sm font-medium text-gold-400">
                      {scanResult.ticket.ticket_type}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={resetScanner}
                className="w-full bg-night-700 hover:bg-night-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Scan Next Ticket
              </button>
            </div>
          )}

          {/* Invalid */}
          {scanResult.result === 'invalid' && (
            <div className="bg-red-500/10 border-2 border-red-500 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-10 h-10 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-red-400">Invalid Ticket</p>
                  <p className="text-sm text-red-300/70">
                    {scanResult.message || 'This ticket could not be verified'}
                  </p>
                </div>
              </div>

              <button
                onClick={resetScanner}
                className="w-full bg-night-700 hover:bg-night-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Scan Next Ticket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
