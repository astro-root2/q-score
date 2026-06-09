// @ts-nocheck
export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'checkbox'

export interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
  placeholder?: string
}

export interface EntryForm {
  id: string
  tournament_id: string
  title: string
  description: string | null
  fields: FormField[]
  is_open: boolean
  created_at: string
}

export interface EntryResponse {
  id: string
  form_id: string
  tournament_id: string
  data: Record<string, string | number | boolean>
  participant_id: string | null
  created_at: string
}
