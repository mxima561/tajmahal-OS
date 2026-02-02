'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { QrCode, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function ScannerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    // Verify user is staff/admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (adminError || !adminUser) {
      await supabase.auth.signOut()
      setError('You do not have scanner access')
      setLoading(false)
      return
    }

    // Update last login (non-blocking)
    supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminUser.id)
      .then(() => {})

    router.push('/scanner')
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-night-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-4">
            <QrCode className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-2xl font-bold text-gold-gradient">
            Taj Mahal
          </h1>
          <p className="text-night-400 text-sm mt-1">Door Scanner</p>
        </div>

        {/* Login Card */}
        <div className="bg-night-900 border border-night-700 rounded-xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="scanner-email" className="block text-sm text-night-200 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400" />
                <input
                  id="scanner-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-night-800 border border-night-600 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-night-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  placeholder="staff@tajmahalsharm.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="scanner-password" className="block text-sm text-night-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-400" />
                <input
                  id="scanner-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-night-800 border border-night-600 rounded-lg py-3 pl-10 pr-12 text-white placeholder:text-night-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-night-400 hover:text-night-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-night-950 font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Open Scanner'}
            </button>
          </form>
        </div>

        <p className="text-center text-night-600 text-xs mt-6">
          Staff access only
        </p>
      </div>
    </div>
  )
}
