'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function ScannerUrlCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for insecure contexts
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 bg-night-800 border border-night-600 rounded-lg px-3 py-2 text-sm text-night-200 truncate">
        {url}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 bg-night-700 hover:bg-night-600 border border-night-600 text-white px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-1.5"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  )
}
