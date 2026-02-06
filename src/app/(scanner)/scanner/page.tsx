'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Camera,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
} from 'lucide-react'

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

export default function MobileScannerPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult>(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)

  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const isProcessingRef = useRef(false)

  // Fetch published events
  useEffect(() => {
    async function fetchEvents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('events')
        .select('id, name, start_time, status')
        .eq('status', 'published')
        .order('start_time', { ascending: false })

      setEvents(data || [])
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id)
      }
    }

    fetchEvents()
  }, [])

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === 2) { // SCANNING
          await html5QrCodeRef.current.stop()
        }
      } catch {
        // ignore stop errors
      }
      html5QrCodeRef.current = null
    }
    setCameraActive(false)
  }, [])

  const resetScanner = useCallback(() => {
    setScanResult(null)
    setManualCode('')
    setShowSuccess(false)
    isProcessingRef.current = false
  }, [])

  async function verifyCode(code: string) {
    if (!code.trim() || !selectedEventId || isProcessingRef.current) return

    isProcessingRef.current = true
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
        setScanResult({ result: 'invalid', message: data.error || 'Verification failed' })
        return
      }

      setScanResult(data)

      // Auto-reset for invalid/already_used after 3s
      if (data.result !== 'valid') {
        setTimeout(() => {
          resetScanner()
        }, 3000)
      }
    } catch {
      setScanResult({ result: 'invalid', message: 'Network error' })
      setTimeout(() => resetScanner(), 3000)
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
        setScanResult({ result: 'invalid', message: data.error || 'Check-in failed' })
        return
      }

      setShowSuccess(true)
      setTimeout(() => {
        resetScanner()
      }, 2000)
    } catch {
      setScanResult({ result: 'invalid', message: 'Network error — could not check in' })
    } finally {
      setCheckingIn(false)
    }
  }

  // Start camera
  const startCamera = useCallback(async () => {
    if (!scannerRef.current || !selectedEventId) return

    setCameraError(null)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      // Clean up existing instance
      await stopCamera()

      const scannerId = 'mobile-qr-reader'

      // Ensure the target element exists
      if (!document.getElementById(scannerId)) return

      const html5QrCode = new Html5Qrcode(scannerId)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          disableFlip: false,
        },
        (decodedText) => {
          if (!isProcessingRef.current) {
            if (navigator.vibrate) {
              navigator.vibrate(100)
            }
            verifyCode(decodedText)
          }
        },
        () => {
          // No QR in frame — expected, ignore
        }
      )

      setCameraActive(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not access camera'
      setCameraError(message)
      setCameraActive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, stopCamera])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    verifyCode(manualCode)
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
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-night-900/80 backdrop-blur-xs border-b border-night-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gold-400 tracking-wide">
            Taj Mahal Scanner
          </h1>
          <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-400 animate-pulse' : 'bg-night-600'}`} />
        </div>

        {/* Event Selector */}
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value)
              resetScanner()
            }}
            className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-2.5 text-sm text-white appearance-none focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
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
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Result Overlay — shows on top of camera */}
        {(scanResult || loading || showSuccess) && (
          <div className="p-4">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
              </div>
            )}

            {/* Success */}
            {showSuccess && (
              <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-8 text-center">
                <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-3" />
                <p className="text-2xl font-bold text-green-400">Checked In!</p>
              </div>
            )}

            {/* Valid Ticket */}
            {scanResult && !loading && !showSuccess && scanResult.result === 'valid' && scanResult.ticket && (
              <div className="bg-green-500/10 border-2 border-green-500 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-10 h-10 text-green-400 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-green-400">Valid Ticket</p>
                    <p className="text-sm text-green-300/70">{scanResult.ticket.display_code}</p>
                  </div>
                </div>

                <div className="bg-night-900/60 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-night-400">Name</span>
                    <span className="text-sm font-medium text-white">
                      {scanResult.ticket.holder_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-night-400">Type</span>
                    <span className="text-sm font-medium text-gold-400">
                      {scanResult.ticket.ticket_type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleCheckin(scanResult.ticket!.id)}
                  disabled={checkingIn}
                  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg"
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
                  Cancel & scan next
                </button>
              </div>
            )}

            {/* Already Used */}
            {scanResult && !loading && !showSuccess && scanResult.result === 'already_used' && (
              <div className="bg-amber-500/10 border-2 border-amber-500 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-10 h-10 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-amber-400">Already Checked In</p>
                    {scanResult.ticket?.checked_in_at && (
                      <p className="text-sm text-amber-300/70">
                        at {formatCheckinTime(scanResult.ticket.checked_in_at)}
                      </p>
                    )}
                  </div>
                </div>

                {scanResult.ticket && (
                  <div className="bg-night-900/60 rounded-xl p-4 space-y-2">
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
                  </div>
                )}

                <p className="text-xs text-center text-night-500">Auto-dismissing...</p>
              </div>
            )}

            {/* Invalid */}
            {scanResult && !loading && !showSuccess && scanResult.result === 'invalid' && (
              <div className="bg-red-500/10 border-2 border-red-500 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle className="w-10 h-10 text-red-400 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-red-400">Invalid</p>
                    <p className="text-sm text-red-300/70">
                      {scanResult.message || 'Ticket could not be verified'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center text-night-500">Auto-dismissing...</p>
              </div>
            )}
          </div>
        )}

        {/* Camera Viewfinder */}
        {selectedEventId && !scanResult && !loading && !showSuccess && (
          <div className="p-4 space-y-4">
            <div
              ref={scannerRef}
              className="relative bg-night-900 rounded-2xl overflow-hidden border border-night-700"
            >
              <div id="mobile-qr-reader" className="w-full" />

              {/* QR focus guide overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Dimmed corners */}
                  <div className="absolute inset-0 bg-black/40" />
                  {/* Clear center cutout */}
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60">
                    <div className="absolute inset-0 bg-transparent" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-lg" style={{ borderTop: '3px solid #FFCC33', borderLeft: '3px solid #FFCC33' }} />
                    <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-lg" style={{ borderTop: '3px solid #FFCC33', borderRight: '3px solid #FFCC33' }} />
                    <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-lg" style={{ borderBottom: '3px solid #FFCC33', borderLeft: '3px solid #FFCC33' }} />
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-lg" style={{ borderBottom: '3px solid #FFCC33', borderRight: '3px solid #FFCC33' }} />
                    {/* Scanning line animation */}
                    <div className="absolute left-2 right-2 h-0.5 bg-gold-400/60 animate-bounce" style={{ top: '50%' }} />
                  </div>
                  <p className="absolute bottom-4 text-xs text-white/70 tracking-wide">Align QR code inside the box</p>
                </div>
              )}

              {!cameraActive && !cameraError && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Camera className="w-12 h-12 text-night-600 mb-4" />
                  <button
                    onClick={startCamera}
                    className="bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-night-950 font-semibold px-6 py-3 rounded-xl transition-colors"
                  >
                    Start Camera
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <XCircle className="w-10 h-10 text-red-400 mb-3" />
                  <p className="text-sm text-red-400 text-center mb-4">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="bg-night-700 hover:bg-night-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Manual Entry Toggle */}
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="w-full flex items-center justify-center gap-2 text-sm text-night-400 hover:text-night-200 py-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              {showManualEntry ? 'Hide manual entry' : 'Enter code manually'}
            </button>

            {showManualEntry && (
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="TM-XXXX or scan data"
                  className="flex-1 bg-night-800 border border-night-600 rounded-lg px-3 py-3 text-white text-sm placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 uppercase tracking-wider"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  className="bg-gold-500 hover:bg-gold-600 active:bg-gold-700 disabled:opacity-50 text-night-950 font-semibold px-5 py-3 rounded-lg transition-colors text-sm"
                >
                  Verify
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
