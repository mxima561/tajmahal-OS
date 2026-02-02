'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'invisible'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

interface TurnstileProps {
  onToken: (token: string) => void
  onExpired?: () => void
  onError?: () => void
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function Turnstile({ onToken, onExpired, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const scriptLoadedRef = useRef(false)

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || !SITE_KEY) return
    if (widgetIdRef.current) return // already rendered

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onToken,
      'expired-callback': onExpired,
      'error-callback': onError,
      theme: 'dark',
      size: 'normal',
    })
  }, [onToken, onExpired, onError])

  useEffect(() => {
    if (!SITE_KEY) return

    if (window.turnstile) {
      renderWidget()
      return
    }

    if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true
      window.onloadTurnstileCallback = renderWidget

      const script = document.createElement('script')
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback'
      script.async = true
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [renderWidget])

  // Skip rendering entirely if no site key configured
  if (!SITE_KEY) return null

  return <div ref={containerRef} className="flex justify-center my-4" />
}
