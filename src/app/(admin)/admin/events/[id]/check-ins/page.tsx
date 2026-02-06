'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Ticket,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Activity,
} from 'lucide-react'

type CapacityInfo = {
  ticketCheckIns: number
  guestCheckIns: number
  totalHeadcount: number
  venueCapacity: number | null
  ticketCapacity: number
  status: 'green' | 'yellow' | 'red' | 'locked'
  percentage: number
}

type RecentScan = {
  id: string
  scan_result: string
  scanned_at: string
  notes: string | null
  ticket_id: string | null
  order_id: string | null
}

export default function CheckInDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = use(params)

  const [capacity, setCapacity] = useState<CapacityInfo | null>(null)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/scanner?eventId=${eventId}`)
        if (res.ok) {
          const data = await res.json()
          setCapacity(data.capacity)
          setRecentScans(data.recentScans || [])
          setLastUpdated(new Date())
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [eventId])

  function getCapacityColor(status: string) {
    switch (status) {
      case 'green': return 'text-green-400'
      case 'yellow': return 'text-yellow-400'
      case 'red': return 'text-red-400'
      case 'locked': return 'text-red-500'
      default: return 'text-night-400'
    }
  }

  function getCapacityBg(status: string) {
    switch (status) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      case 'locked': return 'bg-red-600'
      default: return 'bg-night-600'
    }
  }

  function getCapacityLabel(status: string) {
    switch (status) {
      case 'green': return 'Normal'
      case 'yellow': return 'Filling Up'
      case 'red': return 'Near Capacity'
      case 'locked': return 'AT CAPACITY'
      default: return '—'
    }
  }

  function getScanIcon(result: string) {
    switch (result) {
      case 'valid': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'duplicate': return <AlertTriangle className="w-4 h-4 text-amber-400" />
      case 'invalid': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Activity className="w-4 h-4 text-night-400" />
    }
  }

  function getScanLabel(result: string) {
    switch (result) {
      case 'valid': return 'Checked In'
      case 'duplicate': return 'Duplicate Scan'
      case 'invalid': return 'Invalid'
      case 'expired': return 'Expired'
      default: return result
    }
  }

  function getScanColor(result: string) {
    switch (result) {
      case 'valid': return 'text-green-400'
      case 'duplicate': return 'text-amber-400'
      case 'invalid': return 'text-red-400'
      default: return 'text-night-400'
    }
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch {
      return iso
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
      </div>
    )
  }

  const effectiveCapacity = capacity
    ? (capacity.venueCapacity ?? capacity.ticketCapacity)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/events/${eventId}`}
            className="p-2 rounded-lg bg-night-800 hover:bg-night-700 border border-night-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Live Check-ins</h1>
            <p className="text-sm text-night-400 mt-0.5">
              Real-time door monitoring
              {lastUpdated && (
                <span className="ml-2 text-night-500">
                  Updated {formatTime(lastUpdated.toISOString())}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-night-400">Live</span>
        </div>
      </div>

      {/* Capacity Hero */}
      {capacity && (
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-night-300">Venue Capacity</h2>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              capacity.status === 'green' ? 'bg-green-500/10 text-green-400' :
              capacity.status === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' :
              capacity.status === 'red' ? 'bg-red-500/10 text-red-400' :
              'bg-red-500/20 text-red-500'
            }`}>
              {getCapacityLabel(capacity.status)}
            </span>
          </div>

          {/* Large Number */}
          <div className="text-center mb-4">
            <span className={`text-6xl font-black ${getCapacityColor(capacity.status)}`}>
              {capacity.totalHeadcount}
            </span>
            {effectiveCapacity > 0 && (
              <span className="text-3xl text-night-500 font-bold">
                /{effectiveCapacity}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {effectiveCapacity > 0 && (
            <div className="mb-4">
              <div className="w-full h-4 bg-night-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getCapacityBg(capacity.status)}`}
                  style={{ width: `${Math.min(capacity.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-night-500">
                <span>0</span>
                <span className={`font-bold ${getCapacityColor(capacity.status)}`}>
                  {capacity.percentage}%
                </span>
                <span>{effectiveCapacity}</span>
              </div>
            </div>
          )}

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-night-800/50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-night-400">Ticket Check-ins</p>
                <p className="text-xl font-bold text-white">{capacity.ticketCheckIns}</p>
              </div>
            </div>
            <div className="bg-night-800/50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-night-400">Guest Check-ins</p>
                <p className="text-xl font-bold text-white">{capacity.guestCheckIns}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Timeline */}
      <div className="bg-night-900 border border-night-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-night-700 flex items-center justify-between">
          <h2 className="font-semibold">Scan Timeline</h2>
          <span className="text-xs text-night-500">{recentScans.length} recent</span>
        </div>

        {recentScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-night-400">
            <Activity className="w-10 h-10 mb-3 text-night-600" />
            <p className="text-sm">No scans yet</p>
          </div>
        ) : (
          <div className="divide-y divide-night-800 max-h-[500px] overflow-y-auto">
            {recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center gap-3 px-4 py-3 hover:bg-night-800/50 transition-colors">
                {getScanIcon(scan.scan_result)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getScanColor(scan.scan_result)}`}>
                      {getScanLabel(scan.scan_result)}
                    </span>
                  </div>
                  {scan.notes && (
                    <p className="text-xs text-night-500 truncate mt-0.5">{scan.notes}</p>
                  )}
                </div>
                <span className="text-xs text-night-500 shrink-0">
                  {formatTime(scan.scanned_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/admin/events/${eventId}/guest-list`}
          className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3 hover:bg-night-800 transition-colors"
        >
          <Users className="w-5 h-5 text-gold-500" />
          <span className="text-sm font-medium">Guest List</span>
        </Link>
        <Link
          href={`/admin/events/${eventId}`}
          className="bg-night-900 border border-night-700 rounded-xl p-4 flex items-center gap-3 hover:bg-night-800 transition-colors"
        >
          <Ticket className="w-5 h-5 text-gold-500" />
          <span className="text-sm font-medium">Event Details</span>
        </Link>
      </div>
    </div>
  )
}
