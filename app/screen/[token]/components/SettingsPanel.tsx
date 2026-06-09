// @ts-nocheck
import type { ScreenSettings } from '../types'

interface Props {
  settings: ScreenSettings
  onChange: (s: ScreenSettings) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const set = (key: keyof ScreenSettings, val: any) =>
    onChange({ ...settings, [key]: val })

  const Toggle = ({ label, k }: { label: string; k: keyof ScreenSettings }) => (
    <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, cursor:'pointer', padding:'4px 0' }}>
      <span style={{ color:'#cbd5e1', fontSize:13 }}>{label}</span>
      <div
        onClick={() => set(k, !settings[k])}
        style={{
          width:36, height:20, borderRadius:10, cursor:'pointer',
          background: settings[k] ? '#3b82f6' : '#374151',
          position:'relative', transition:'background 0.2s', flexShrink:0,
        }}
      >
        <div style={{
          position:'absolute', top:3, left: settings[k] ? 19 : 3,
          width:14, height:14, borderRadius:'50%', background:'#fff',
          transition:'left 0.2s',
        }} />
      </div>
    </label>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'flex-end', padding:16 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0 }} />
      <div style={{
        position:'relative', zIndex:1,
        background:'#0f172a', border:'1px solid #1e293b',
        borderRadius:16, padding:20, width:320,
        boxShadow:'0 24px 48px rgba(0,0,0,0.8)',
        display:'flex', flexDirection:'column', gap:4,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ color:'#f1f5f9', fontWeight:800, fontSize:15 }}>表示設定</span>
          <button onClick={onClose} style={{ color:'#64748b', background:'none', border:'none', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>

        <div style={{ color:'#64748b', fontSize:11, fontWeight:700, letterSpacing:'0.1em', marginTop:4 }}>ヘッダー</div>
        <Toggle label="Round名" k="showRoundName" />
        <Toggle label="ルール名" k="showRuleName" />
        <Toggle label="Q番号" k="showQNumber" />
        <Toggle label="人数表示" k="showPlayerCount" />
        <Toggle label="大会ロゴ" k="showLogo" />
        <Toggle label="グループ名" k="showGroupName" />
        <Toggle label="大会名" k="showTournamentName" />

        <div style={{ color:'#64748b', fontSize:11, fontWeight:700, letterSpacing:'0.1em', marginTop:12 }}>問題・解答エリア</div>
        <Toggle label="エリアを表示" k="showQAArea" />
        {settings.showQAArea && <>
          <Toggle label="問題文を表示" k="showQuestion" />
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ color:'#64748b', fontSize:11 }}>問題プレースホルダー</span>
            <input
              value={settings.questionPlaceholder}
              onChange={e => set('questionPlaceholder', e.target.value)}
              style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'6px 10px', color:'#f1f5f9', fontSize:12, outline:'none' }}
            />
          </div>
          <Toggle label="解答を表示" k="showAnswer" />
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ color:'#64748b', fontSize:11 }}>解答プレースホルダー</span>
            <input
              value={settings.answerPlaceholder}
              onChange={e => set('answerPlaceholder', e.target.value)}
              style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'6px 10px', color:'#f1f5f9', fontSize:12, outline:'none' }}
            />
          </div>
        </>}

        <div style={{ marginTop:8, color:'#374151', fontSize:11, textAlign:'center' }}>S キーで開閉</div>
      </div>
    </div>
  )
}
