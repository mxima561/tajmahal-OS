import { format, formatDistanceToNow } from 'date-fns'

export function formatCurrency(amount: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatEventDate(date: string): string {
  return format(new Date(date), 'EEEE, MMMM d, yyyy')
}

export function formatEventTime(date: string): string {
  return format(new Date(date), 'h:mm a')
}

export function formatDateTime(date: string): string {
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TM-${timestamp}-${random}`
}

export function generateDisplayCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No 0/O, 1/I/L
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `TM-${code}`
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
