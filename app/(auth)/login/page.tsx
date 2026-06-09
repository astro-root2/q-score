// @ts-nocheck
'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const supabase = createClient()
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'メールアドレスまたはパスワードが違います' : error.message)
      setLoading(false); return
    }
    router.push(redirect); router.refresh()
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-3xl font-black text-white">
            <span className="text-brand-400">Q</span><span>Score</span><span className="text-brand-400">+</span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">早押しクイズ大会 統合運営システム</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">メールアドレス</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              autoComplete="email"
              className={cn('w-full px-4 py-2.5 rounded-lg bg-zinc-800 border text-white placeholder-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors',
                error ? 'border-red-500' : 'border-zinc-700')}
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">パスワード</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              autoComplete="current-password"
              className={cn('w-full px-4 py-2.5 rounded-lg bg-zinc-800 border text-white placeholder-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors',
                error ? 'border-red-500' : 'border-zinc-700')}
              placeholder="••••••••" />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 active:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <p className="text-center text-sm text-zinc-500">
          アカウントがない方は{' '}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 underline">新規登録</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
