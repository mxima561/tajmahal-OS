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
  Users,
  ShoppingBag,
  ScanLine,
  UserCheck,
  Plus,
  Minus,
} from 'lucide-react'

type Event = {
  id: string
  name: string
  start_time: string
  status: string
}

type TicketType = {
  id: string
  name: string
  price: number
  quantity_total: number
  quantity_sold: number | null
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

type CapacityInfo = {
  ticketCheckIns: number
  guestCheckIns: number
  totalHeadcount: number
  venueCapacity: number | null
  ticketCapacity: number
  status: 'green' | 'yellow' | 'red' | 'locked'
  percentage: number
}

type GuestEntry = {
  id: string
  name: string
  email: string | null
  phone: string | null
  plus_count: number | null
  status: string
  checked_in_at: string | null
  notes: string | null
  added_by_name: string | null
}

type RecentScan = {
  id: string
  scan_result: string
  scanned_at: string
  notes: string | null
}

type TabId = 'scan' | 'guests' | 'door-sales'

export default function MobileScannerPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabId>('scan')

  // Scan state
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult>(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Capacity & stats
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])

  // Guest list state
  const [guests, setGuests] = useState<GuestEntry[]>([])
  const [guestSearch, setGuestSearch] = useState('')
  const [guestLoading, setGuestLoading] = useState(false)

  // Door sales state
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [doorSaleTicketType, setDoorSaleTicketType] = useState('')
  const [doorSaleQty, setDoorSaleQty] = useState(1)
  const [doorSalePayment, setDoorSalePayment] = useState<'cash' | 'card' | 'comp'>('cash')
  const [doorSaleName, setDoorSaleName] = useState('')
  const [doorSaleLoading, setDoorSaleLoading] = useState(false)
  const [doorSaleResult, setDoorSaleResult] = useState<{ success: boolean; message: string } | null>(null)

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

  // Fetch ticket types when event changes
  useEffect(() => {
    if (!selectedEventId) return
    async function fetchTicketTypes() {
      const supabase = createClient()
      const { data } = await supabase
        .from('ticket_types')
        .select('id, name, price, quantity_total, quantity_sold')
        .eq('event_id', selectedEventId)
        .order('sort_order')
      setTicketTypes(data || [])
      if (data && data.length > 0) {
        setDoorSaleTicketType(data[0].id)
      }
    }
    fetchTicketTypes()
  }, [selectedEventId])

  // Poll for live stats every 5 seconds
  useEffect(() => {
    if (!selectedEventId) return

    async function fetchStats() {
      try {
        const res = await fetch(`/api/scanner?eventId=${selectedEventId}`)
        if (res.ok) {
          const data = await res.json()
          setCapacity(data.capacity)
          setRecentScans(data.recentScans || [])
        }
      } catch {
        // silently fail on stats fetch
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [selectedEventId])

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === 2) {
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

      if (data.result !== 'valid') {
        setTimeout(() => resetScanner(), 3000)
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
          eventId: selectedEventId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setScanResult({ result: 'invalid', message: data.error || 'Check-in failed' })
        return
      }

      if (data.capacity) setCapacity(data.capacity)
      setShowSuccess(true)
      setTimeout(() => resetScanner(), 2000)
    } catch {
      setScanResult({ result: 'invalid', message: 'Network error — could not check in' })
    } finally {
      setCheckingIn(false)
    }
  }

  const startCamera = useCallback(async () => {
    if (!scannerRef.current || !selectedEventId) return
    setCameraError(null)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      await stopCamera()

      const scannerId = 'mobile-qr-reader'
      if (!document.getElementById(scannerId)) return

      const html5QrCode = new Html5Qrcode(scannerId)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 20, disableFlip: false },
        (decodedText) => {
          if (!isProcessingRef.current) {
            if (navigator.vibrate) navigator.vibrate(100)
            verifyCode(decodedText)
          }
        },
        () => {}
      )

      setCameraActive(true)
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Could not access camera')
      setCameraActive(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, stopCamera])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  // Guest list handlers
  async function fetchGuests(search?: string) {
    if (!selectedEventId) return
    setGuestLoading(true)
    try {
      const params = new URLSearchParams({ eventId: selectedEventId })
      if (search?.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/guest-list?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGuests(data.entries || [])
      }
    } catch {
      // ignore
    } finally {
      setGuestLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'guests' && selectedEventId) {
      fetchGuests(guestSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEventId])

  async function handleGuestCheckin(guestId: string) {
    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guest-checkin',
          guestId,
          eventId: selectedEventId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.capacity) setCapacity(data.capacity)
      fetchGuests(guestSearch)
    } catch {
      // ignore
    }
  }

  // Door sale handler
  async function handleDoorSale(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEventId || !doorSaleTicketType) return
    setDoorSaleLoading(true)
    setDoorSaleResult(null)

    try {
      const res = await fetch('/api/scanner/door-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          ticketTypeId: doorSaleTicketType,
          quantity: doorSaleQty,
          paymentMethod: doorSalePayment,
          customerName: doorSaleName.trim() || 'Walk-up',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setDoorSaleResult({ success: true, message: `${data.quantity}x sold — ${data.orderNumber}` })
        if (data.capacity) setCapacity(data.capacity)
        setDoorSaleName('')
        setDoorSaleQty(1)
        setTimeout(() => setDoorSaleResult(null), 3000)
      } else {
        setDoorSaleResult({ success: false, message: data.error || 'Sale failed' })
      }
    } catch {
      setDoorSaleResult({ success: false, message: 'Network error' })
    } finally {
      setDoorSaleLoading(false)
    }
  }

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

  function getCapacityBarColor(status: string) {
    switch (status) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      case 'locked': return 'bg-red-600'
      default: return 'bg-night-600'
    }
  }

  function getCapacityTextColor(status: string) {
    switch (status) {
      case 'green': return 'text-green-400'
      case 'yellow': return 'text-yellow-400'
      case 'red': return 'text-red-400'
      case 'locked': return 'text-red-500'
      default: return 'text-night-400'
    }
  }

  const tabs: { id: TabId; label: string; icon: typeof ScanLine }[] = [
    { id: 'scan', label: 'Scan', icon: ScanLine },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'door-sales', label: 'Door Sale', icon: ShoppingBag },
  ]

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-night-900/80 backdrop-blur-xs border-b border-night-800">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gold-400 tracking-wide">
            Taj Mahal Scanner
          </h1>
          <div className="flex items-center gap-2">
            {capacity && (
              <span className={`text-sm font-bold ${getCapacityTextColor(capacity.status)}`}>
                {capacity.totalHeadcount}
                {(capacity.venueCapacity ?? capacity.ticketCapacity) > 0 && (
                  <span className="text-night-500">/{capacity.venueCapacity ?? capacity.ticketCapacity}</span>
                )}
              </span>
            )}
            <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-400 animate-pulse' : 'bg-night-600'}`} />
          </div>
        </div>

        {/* Capacity Bar */}
        {capacity && (capacity.venueCapacity ?? capacity.ticketCapacity) > 0 && (
          <div className="mb-2">
            <div className="w-full h-2 bg-night-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getCapacityBarColor(capacity.status)}`}
                style={{ width: `${Math.min(capacity.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-night-500">
              <span>{capacity.ticketCheckIns} tickets + {capacity.guestCheckIns} guests</span>
              <span className={getCapacityTextColor(capacity.status)}>
                {capacity.percentage}%
              </span>
            </div>
          </div>
        )}

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

        {/* Tab Bar */}
        <div className="flex mt-3 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-night-400 hover:text-night-200 hover:bg-night-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* ===== SCAN TAB ===== */}
        {activeTab === 'scan' && (
          <>
            {/* Result Overlay */}
            {(scanResult || loading || showSuccess) && (
              <div className="p-4">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
                  </div>
                )}

                {showSuccess && (
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-8 text-center">
                    <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-3" />
                    <p className="text-2xl font-bold text-green-400">Checked In!</p>
                  </div>
                )}

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

                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative w-52 h-52 sm:w-60 sm:h-60">
                        <div className="absolute inset-0 bg-transparent" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                        <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-lg" style={{ borderTop: '3px solid #FFCC33', borderLeft: '3px solid #FFCC33' }} />
                        <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-lg" style={{ borderTop: '3px solid #FFCC33', borderRight: '3px solid #FFCC33' }} />
                        <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-lg" style={{ borderBottom: '3px solid #FFCC33', borderLeft: '3px solid #FFCC33' }} />
                        <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-lg" style={{ borderBottom: '3px solid #FFCC33', borderRight: '3px solid #FFCC33' }} />
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

                {/* Recent Scans */}
                {recentScans.length > 0 && (
                  <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-night-700">
                      <p className="text-xs font-medium text-night-400 uppercase tracking-wide">Recent Scans</p>
                    </div>
                    <div className="divide-y divide-night-800 max-h-48 overflow-y-auto">
                      {recentScans.slice(0, 10).map((scan) => (
                        <div key={scan.id} className="flex items-center justify-between px-4 py-2">
                          <div className="flex items-center gap-2">
                            {scan.scan_result === 'valid' && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                            {scan.scan_result === 'duplicate' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                            {scan.scan_result === 'invalid' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                            <span className="text-xs text-night-300 truncate max-w-[180px]">
                              {scan.notes || scan.scan_result}
                            </span>
                          </div>
                          <span className="text-[10px] text-night-500">
                            {formatCheckinTime(scan.scanned_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== GUEST LIST TAB ===== */}
        {activeTab === 'guests' && (
          <div className="p-4 space-y-3">
            {/* Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                fetchGuests(guestSearch)
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Search guest name..."
                className="flex-1 bg-night-800 border border-night-600 rounded-lg px-3 py-3 text-white text-sm placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={guestLoading}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-night-950 font-semibold px-4 py-3 rounded-lg transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Guest List */}
            {guestLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
              </div>
            ) : guests.length === 0 ? (
              <div className="text-center py-12 text-night-500">
                <Users className="w-10 h-10 mx-auto mb-3 text-night-600" />
                <p className="text-sm">No guests found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className={`bg-night-900 border rounded-xl p-4 ${
                      guest.status === 'checked_in'
                        ? 'border-green-500/30'
                        : 'border-night-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{guest.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(guest.plus_count ?? 0) > 0 && (
                            <span className="text-xs text-gold-400">+{guest.plus_count}</span>
                          )}
                          {guest.added_by_name && (
                            <span className="text-xs text-night-500">by {guest.added_by_name}</span>
                          )}
                        </div>
                        {guest.notes && (
                          <p className="text-xs text-night-500 mt-1">{guest.notes}</p>
                        )}
                      </div>

                      {guest.status === 'checked_in' ? (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <UserCheck className="w-5 h-5" />
                          <span className="text-xs">
                            {guest.checked_in_at ? formatCheckinTime(guest.checked_in_at) : 'In'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGuestCheckin(guest.id)}
                          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== DOOR SALES TAB ===== */}
        {activeTab === 'door-sales' && (
          <div className="p-4">
            <form onSubmit={handleDoorSale} className="space-y-4">
              {/* Ticket Type */}
              <div>
                <label className="block text-xs font-medium text-night-400 mb-1.5 uppercase tracking-wide">
                  Ticket Type
                </label>
                <div className="relative">
                  <select
                    value={doorSaleTicketType}
                    onChange={(e) => setDoorSaleTicketType(e.target.value)}
                    className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-3 text-sm text-white appearance-none focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                  >
                    {ticketTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name} — EGP {tt.price} ({tt.quantity_total - (tt.quantity_sold || 0)} left)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400 pointer-events-none" />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-night-400 mb-1.5 uppercase tracking-wide">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDoorSaleQty(Math.max(1, doorSaleQty - 1))}
                    className="w-10 h-10 rounded-lg bg-night-800 border border-night-600 flex items-center justify-center text-white hover:bg-night-700 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-white w-12 text-center">{doorSaleQty}</span>
                  <button
                    type="button"
                    onClick={() => setDoorSaleQty(Math.min(10, doorSaleQty + 1))}
                    className="w-10 h-10 rounded-lg bg-night-800 border border-night-600 flex items-center justify-center text-white hover:bg-night-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-night-400 mb-1.5 uppercase tracking-wide">
                  Payment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'comp'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setDoorSalePayment(method)}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        doorSalePayment === method
                          ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                          : 'bg-night-800 text-night-300 border border-night-600 hover:bg-night-700'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Name (optional) */}
              <div>
                <label className="block text-xs font-medium text-night-400 mb-1.5 uppercase tracking-wide">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={doorSaleName}
                  onChange={(e) => setDoorSaleName(e.target.value)}
                  placeholder="Walk-up"
                  className="w-full bg-night-800 border border-night-600 rounded-lg px-3 py-3 text-white text-sm placeholder:text-night-500 focus:outline-hidden focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              {/* Result */}
              {doorSaleResult && (
                <div className={`p-3 rounded-lg text-sm font-medium text-center ${
                  doorSaleResult.success
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {doorSaleResult.message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={doorSaleLoading || !doorSaleTicketType}
                className="w-full bg-gold-500 hover:bg-gold-600 active:bg-gold-700 disabled:opacity-50 text-night-950 font-bold py-4 rounded-xl transition-colors text-lg"
              >
                {doorSaleLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  `Sell ${doorSaleQty} Ticket${doorSaleQty > 1 ? 's' : ''}`
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
