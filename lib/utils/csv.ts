import Papa from 'papaparse'

export interface ParticipantCSVRow {
  name: string
  ruby?: string
  team?: string
  seed?: string
  group?: string
  note?: string
}

export interface QuestionCSVRow {
  seq?: string
  question: string
  answer: string
  genre?: string
  difficulty?: string
  note?: string
}

export async function parseCSV<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: (error) => reject(error),
    })
  })
}

export function validateParticipantCSV(rows: ParticipantCSVRow[]): {
  valid: boolean; errors: string[]; data: ParticipantCSVRow[]
} {
  const errors: string[] = []
  const data: ParticipantCSVRow[] = []

  rows.forEach((row, i) => {
    const lineNum = i + 2
    if (!row.name?.trim()) {
      errors.push(`行${lineNum}: name は必須項目です`)
      return
    }
    data.push({
      name: row.name.trim(),
      ruby: row.ruby?.trim() ?? '',
      team: row.team?.trim() ?? '',
      seed: row.seed?.trim() ?? '0',
      group: row.group?.trim() ?? '',
      note: row.note?.trim() ?? '',
    })
  })

  return { valid: errors.length === 0, errors, data }
}

export function validateQuestionCSV(rows: QuestionCSVRow[]): {
  valid: boolean; errors: string[]; data: QuestionCSVRow[]
} {
  const errors: string[] = []
  const data: QuestionCSVRow[] = []

  rows.forEach((row, i) => {
    const lineNum = i + 2
    if (!row.question?.trim()) {
      errors.push(`行${lineNum}: question は必須項目です`)
      return
    }
    if (!row.answer?.trim()) {
      errors.push(`行${lineNum}: answer は必須項目です`)
      return
    }
    const diff = parseInt(row.difficulty ?? '1')
    data.push({
      seq: row.seq?.trim() ?? String(i + 1),
      question: row.question.trim(),
      answer: row.answer.trim(),
      genre: row.genre?.trim() ?? '',
      difficulty: isNaN(diff) ? '1' : String(Math.min(5, Math.max(1, diff))),
      note: row.note?.trim() ?? '',
    })
  })

  return { valid: errors.length === 0, errors, data }
}

export function exportResultCSV(
  players: Array<{
    rank: number; name: string; team?: string
    correct: number; wrong: number; points: number; status: string
  }>
): string {
  return Papa.unparse(players.map(p => ({
    順位: p.rank, 氏名: p.name, チーム: p.team ?? '',
    正解数: p.correct, 誤答数: p.wrong, ポイント: p.points,
    結果: p.status === 'winner' ? '勝ち抜け' : p.status === 'eliminated' ? '失格' : '進行中',
  })))
}

export function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
