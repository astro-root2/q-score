'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('パスワードは8文字以上にしてください'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-xl font-bold text-white">確認メールを送信しました</h2>
          <p className="text-zinc-400 text-sm">{email} に確認メールを送りました。<br/>リンクをクリックしてアカウントを有効化してください。</p>
          <Link href="/login" className="inline-block text-brand-400 hover:underline text-sm">ログインページへ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-3xl font-black text-white">
            <span className="text-brand-400">Q</span><span>Score</span><span className="text-brand-400">+</span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">新規アカウント登録</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">表示名</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors"
              placeholder="山田太郎" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">メールアドレス</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">パスワード (8文字以上)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors"
              placeholder="••••••••" />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50">
            {loading ? '登録中...' : 'アカウントを作成'}
          </button>
        </form>
        <p className="text-center text-sm text-zinc-500">
          既にアカウントがある方は{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 underline">ログイン</Link>
        </p>
      </div>
    </div>
  )
}
