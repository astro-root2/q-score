// @ts-nocheck
/**
 * テーマカラー（HEX）からCSS変数セットを生成
 * --accent        : メインカラー
 * --accent-glow   : グロー用（透明度40%）
 * --accent-border : ボーダー用（透明度50%）
 * --accent-dim    : 薄め（透明度15%）
 */
export function buildThemeVars(hex: string): Record<string, string> {
  return {
    '--accent':        hex,
    '--accent-glow':   hex + '66',
    '--accent-border': hex + '80',
    '--accent-dim':    hex + '26',
  }
}

export const DEFAULT_ACCENT = '#00e5ff'
