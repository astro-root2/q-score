import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  async function handleSignOut() {
    'use server'
    const sb = await createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  const displayName = user.user_metadata?.display_name ?? user.email ?? ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050814',
      backgroundImage: `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',system-ui,sans-serif",
    }}>
      <style>{`
        .logout-btn:hover { color: #f1f5f9 !important; background: rgba(255,255,255,0.05) !important; }
      `}</style>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,8,20,0.95)',
        borderBottom: '1px solid rgba(0,229,255,0.15)',
        boxShadow: '0 2px 20px rgba(0,229,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 16px',
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#00e5ff', boxShadow: '0 0 10px #00e5ff' }} />
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            textDecoration: 'none', paddingLeft: 12,
          }}>
            <span style={{
              fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em',
              color: '#00e5ff', textShadow: '0 0 20px #00e5ff80',
            }}>Q</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Score</span>
            <span style={{ color: '#00e5ff', fontWeight: 900, fontSize: 18 }}>+</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#334155' }}>{displayName}</span>
            <form action={handleSignOut}>
              <button type="submit" className="logout-btn" style={{
                fontSize: 12, color: '#475569', background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px' }}>
        {children}
      </main>
    </div>
  )
}
