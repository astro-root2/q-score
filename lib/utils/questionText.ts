// @ts-nocheck
// 読み上げ区切りの内部表現。問題文中の通常の "/" と区別するために使用
export const SLASH_MARKER = '{/}'

// 表示用にマーカーをJSXの青スラッシュに変換するための分割
export function splitQuestionText(text: string): string[] {
  return text.split(SLASH_MARKER)
}

// 通常の "/" はそのまま、区切りは "{/}" として保存
// 表示時は splitQuestionText を使う
