/* What a form asks, shared by the builder, the public page and the server.

   A form is a list of modules (sections with a title), each a list of
   questions; then the tickboxes at the end (consents, declarations); then,
   if asked for, a signature. */

export type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'yesno' | 'radio' | 'checkbox' | 'select'
export const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'email', 'phone', 'date', 'yesno', 'radio', 'checkbox', 'select']
/** The types whose answer is picked from a list the administrator writes. */
export const WITH_OPTIONS: FieldType[] = ['radio', 'checkbox', 'select']
/** A yes/no question: a choice whose two answers are always these. */
export const YES_NO = ['Ναι', 'Όχι']
/** Every type answered by picking — what a condition can depend on. */
export const CHOICE_TYPES: FieldType[] = [...WITH_OPTIONS, 'yesno']

/** Shown only when an earlier choice question has one of these answers —
    so a family registering again skips what is only asked the first time. */
export type FormCondition = { q: string, anyOf: string[] }
export type FormQuestion = { id: string, type: FieldType, label: string, help?: string, required: boolean, options: string[], showIf?: FormCondition }
export type FormModule = { id: string, title: string, description?: string, questions: FormQuestion[], showIf?: FormCondition }
export type FormTick = { id: string, label: string, required: boolean }
export type FormSpec = {
  modules: FormModule[]
  ticks: FormTick[]
  signature: { enabled: boolean, required: boolean, label: string }
}
/** What someone sends back. */
export type FormAnswers = {
  answers: Record<string, string | string[]>
  ticks: Record<string, boolean>
  signature?: string | null
}

export const newId = () => Math.random().toString(36).slice(2, 10)

const str = (x: unknown, max: number) => String(x ?? '').trim().slice(0, max)

/** A spec made safe whatever arrived: unknown types dropped, ids kept unique,
    options trimmed, lengths capped. */
export function normalizeSpec(raw: any): FormSpec {
  const seen = new Set<string>()
  const id = (x: unknown) => {
    let v = str(x, 20).replace(/[^a-z0-9]/gi, '') || newId()
    while (seen.has(v)) v = newId()
    seen.add(v)
    return v
  }
  const raws = new Map<object, any>()   // each module or question → its condition as sent
  const modules: FormModule[] = (Array.isArray(raw?.modules) ? raw.modules : []).slice(0, 40).map((m: any) => keep({
    id: id(m?.id),
    title: str(m?.title, 200),
    description: str(m?.description, 2000) || undefined,
    questions: (Array.isArray(m?.questions) ? m.questions : []).slice(0, 100)
      .filter((q: any) => FIELD_TYPES.includes(q?.type))
      .map((q: any) => keep({
        id: id(q?.id),
        type: q.type as FieldType,
        label: str(q?.label, 500),
        help: str(q?.help, 1000) || undefined,
        required: !!q?.required,
        options: q.type === 'yesno' ? [...YES_NO] : WITH_OPTIONS.includes(q.type)
          ? [...new Set((Array.isArray(q?.options) ? q.options : []).map((o: any) => str(o, 200)).filter(Boolean))].slice(0, 60) as string[]
          : []
      }, q?.showIf))
  }, m?.showIf))
  function keep<T extends object>(x: T, showIf: any): T { raws.set(x, showIf); return x }
  // a condition must name a choice question that comes before it, and some
  // of that question's options; anything else is dropped, never guessed at
  const before: FormQuestion[] = []
  const cond = (c: any, pool: FormQuestion[]): FormCondition | undefined => {
    const src = pool.find(q => q.id === c?.q)
    if (!src || !CHOICE_TYPES.includes(src.type)) return undefined
    const anyOf = (Array.isArray(c?.anyOf) ? c.anyOf : []).map((x: any) => String(x)).filter((x: string) => src.options.includes(x))
    return anyOf.length ? { q: src.id, anyOf } : undefined
  }
  for (const m of modules) {
    const c = cond(raws.get(m), before)
    if (c) m.showIf = c
    for (const q of m.questions) {
      const qc = cond(raws.get(q), before)
      if (qc) q.showIf = qc
      before.push(q)
    }
  }
  const ticks = (Array.isArray(raw?.ticks) ? raw.ticks : []).slice(0, 30)
    .map((x: any) => ({ id: id(x?.id), label: str(x?.label, 2000), required: !!x?.required }))
  const sig = raw?.signature || {}
  return {
    modules, ticks,
    signature: { enabled: !!sig.enabled, required: sig.required !== false, label: str(sig.label, 300) }
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[+\d][\d\s()-]{5,}$/

/** One question's answer checked; the error to show, or null. */
export function questionError(q: FormQuestion, v: unknown): string | null {
  const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim()
  if (empty) return q.required ? 'required' : null
  if (q.type === 'checkbox') {
    if (!Array.isArray(v) || v.some(x => !q.options.includes(String(x)))) return 'invalid'
    return null
  }
  const s = String(v).trim()
  if ((q.type === 'radio' || q.type === 'select' || q.type === 'yesno') && !q.options.includes(s)) return 'invalid'
  if (q.type === 'email' && !EMAIL.test(s)) return 'email'
  if (q.type === 'phone' && !PHONE.test(s)) return 'phone'
  if (q.type === 'number' && Number.isNaN(Number(s.replace(',', '.')))) return 'number'
  if (q.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'date'
  return null
}

/** Which modules and questions this set of answers shows. In form order, so
    a condition on a question that is itself hidden counts as not met. */
export function visibleParts(spec: FormSpec, answers: Record<string, any>) {
  const modules = new Set<string>()
  const questions = new Set<string>()
  const met = (c?: FormCondition) => {
    if (!c) return true
    if (!questions.has(c.q)) return false
    const v = answers?.[c.q]
    return Array.isArray(v) ? v.some(x => c.anyOf.includes(String(x))) : c.anyOf.includes(String(v ?? ''))
  }
  for (const m of spec.modules) {
    if (!met(m.showIf)) continue
    modules.add(m.id)
    for (const q of m.questions) if (met(q.showIf)) questions.add(q.id)
  }
  return { modules, questions }
}

/** The answers kept, cleaned, plus every problem by question id. Only what
    the answers show is checked or kept: a hidden question is never required,
    and anything typed into it before it was hidden is let go. */
export function checkAnswers(spec: FormSpec, body: any): { clean: FormAnswers, errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const answers: Record<string, string | string[]> = {}
  const shown = visibleParts(spec, body?.answers || {}).questions
  for (const m of spec.modules) for (const q of m.questions) {
    if (!shown.has(q.id)) continue
    let v = body?.answers?.[q.id]
    if (q.type === 'checkbox') v = Array.isArray(v) ? v.map(x => String(x)) : []
    else v = String(v ?? '').slice(0, q.type === 'textarea' ? 5000 : 500)
    const e = questionError(q, v)
    if (e) errors[q.id] = e
    if (Array.isArray(v) ? v.length : String(v).trim()) answers[q.id] = Array.isArray(v) ? v : String(v).trim()
  }
  const ticks: Record<string, boolean> = {}
  for (const x of spec.ticks) {
    ticks[x.id] = body?.ticks?.[x.id] === true
    if (x.required && !ticks[x.id]) errors[x.id] = 'required'
  }
  let signature: string | null = null
  if (spec.signature.enabled) {
    const sig = String(body?.signature || '')
    if (sig && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) && sig.length < 400_000) signature = sig
    else if (sig) errors.signature = 'invalid'
    if (!signature && spec.signature.required) errors.signature = 'required'
  }
  return { clean: { answers, ticks, signature }, errors }
}

/** An answer as text, for tables and the export — a date the Greek way. */
export function answerText(v: unknown, type?: FieldType): string {
  if (Array.isArray(v)) return v.join(', ')
  const s = String(v ?? '')
  const d = type === 'date' && s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return d ? `${d[3]}/${d[2]}/${d[1]}` : s
}
