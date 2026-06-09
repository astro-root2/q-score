import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Layers, Trophy, Settings, BookOpen, BarChart2, Monitor, ClipboardList } from 'lucide-react'

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
  const t = tournament as any

  const accent = t.theme_color ?? '#00e5ff'

  const navItems = [
    { href: `/t/${tid}`,                    label: 'ダッシュボード', icon: Trophy },
    { href: `/t/${tid}/entry`,              label: 'エントリー',     icon: ClipboardList },
    { href: `/t/${tid}/matches`,            label: '試合',           icon: Monitor },
    { href: `/t/${tid}/setup/participants`, label: '参加者',         icon: Users },
    { href: `/t/${tid}/paper`,              label: 'ペーパー',       icon: BookOpen },
    { href: `/t/${tid}/setup/rounds`,       label: 'ラウンド',       icon: Layers },
    { href: `/t/${tid}/questions`,          label: '問題',           icon: BookOpen },
    { href: `/t/${tid}/results`,            label: '結果',           icon: BarChart2 },
    { href: `/t/${tid}/setup`,              label: '設定',           icon: Settings },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050814',
      backgroundImage: `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',system-ui,sans-serif",
    }}>
      <style>{`
        .nav-link {
          display:flex;align-items:center;gap:6px;
          padding:8px 14px;font-size:12px;font-weight:600;
          color:#475569;text-decoration:none;
          border-bottom:2px solid transparent;white-space:nowrap;
          transition:color 0.15s,border-color 0.15s;letter-spacing:0.05em;
        }
        .nav-link:hover{color:#f1f5f9;border-bottom-color:${accent};}
        .back-btn{
          display:flex;align-items:center;justify-content:center;
          width:30px;height:30px;border:1px solid ${accent}40;
          color:#64748b;text-decoration:none;
          transition:color 0.15s,border-color 0.15s;
          clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%);
        }
        .back-btn:hover{color:#f1f5f9;border-color:${accent}80;}
      `}</style>

      <header style={{
        position:'sticky',top:0,zIndex:40,
        background:'rgba(5,8,20,0.95)',
        borderBottom:`1px solid ${accent}40`,
        boxShadow:`0 2px 20px ${accent}20`,
        backdropFilter:'blur(12px)',
      }}>
        <div style={{
          maxWidth:1280,margin:'0 auto',padding:'0 16px',
          height:52,display:'flex',alignItems:'center',gap:12,position:'relative',
        }}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:accent,boxShadow:`0 0 10px ${accent}`}} />
          <Link href="/" className="back-btn"><ArrowLeft size={16} /></Link>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <div style={{width:4,height:24,background:accent,boxShadow:`0 0 8px ${accent}`,flexShrink:0}} />
            <span style={{fontWeight:900,color:'#f1f5f9',fontSize:16,letterSpacing:'0.05em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {t.name}
            </span>
            {t.status === 'active' && (
              <div style={{
                display:'flex',alignItems:'center',gap:4,
                fontSize:10,fontWeight:700,color:'#10b981',
                padding:'2px 8px',border:'1px solid rgba(16,185,129,0.3)',
                background:'rgba(16,185,129,0.08)',
                clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)',
                letterSpacing:'0.1em',
              }}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 6px #10b981',display:'inline-block'}} />
                LIVE
              </div>
            )}
          </div>
        </div>
        <nav style={{maxWidth:1280,margin:'0 auto',padding:'0 16px',display:'flex',gap:2,overflowX:'auto'}}>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="nav-link">
              <Icon size={13} />{label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{maxWidth:1280,margin:'0 auto',padding:'32px 16px'}}>
        {children}
      </main>
    </div>
  )
}
