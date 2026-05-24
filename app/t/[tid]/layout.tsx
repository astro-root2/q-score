import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Layers, Trophy, Settings, BookOpen, BarChart2 } from 'lucide-react'

interface Props {
  children: React.ReactNode
  params: Promise<{ tid: string }>
}

export default async function TournamentLayout({ children, params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  const navItems = [
    { href: `/t/${tid}`, label: 'ダッシュボード', icon: Trophy },
    { href: `/t/${tid}/matches`, label: '試合', icon: Monitor },
    { href: `/t/${tid}/setup/participants`, label: '参加者', icon: Users },
    { href: `/t/${tid}/paper`, label: 'ペーパー', icon: BookOpen },
    { href: `/t/${tid}/setup/rounds`, label: 'ラウンド', icon: Layers },
    { href: `/t/${tid}/questions`, label: '問題', icon: BookOpen },
    { href: `/t/${tid}/results`, label: '結果', icon: BarChart2 },
    { href: `/t/${tid}/setup`, label: '設定', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tournament.theme_color }} />
            <span className="font-bold text-white truncate">{tournament.name}</span>
            <span className="text-xs text-zinc-500 shrink-0 hidden sm:block">
              {tournament.status === 'active' ? '● 開催中' : ''}
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-zinc-600 transition-colors whitespace-nowrap">
              <Icon size={14} />{label}
            </Link>
          ))}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
