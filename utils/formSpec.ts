/* What a form asks, shared by the builder, the public page and the server.

   A form is a list of modules (sections with a title), each a list of
   questions; then the tickboxes at the end (consents, declarations); then,
   if asked for, a signature. */

export type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'yesno' | 'radio' | 'checkbox' | 'select' | 'file' | 'gaps' | 'calc' | 'child'
export const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'email', 'phone', 'date', 'yesno', 'radio', 'checkbox', 'select', 'file', 'gaps', 'calc', 'child']
/* "Which child": a parent who opens the form from the app picks one of their
   own children (sent as "c:<id>", checked by the server and kept as the
   child's name, with a link to the member); anyone else types the name. In
   a repeated run, each copy names its child — a registration's way of
   saying whose answers these are. */
export const CHILD_PICK = /^c:(\d+)$/

/* Fill the gaps: the question is a sentence with blanks in it — "___" (three
   or more underscores) for a plain one, "[ονοματεπώνυμο]" for one with a hint
   in it — answered in place, one answer per blank, in order. */
export type GapPart = { text: string } | { gap: number, hint: string }
const GAP = /_{3,}|\[([^\]\n]{0,60})\]/g
export function gapParts(label: string): GapPart[] {
  const out: GapPart[] = []
  let at = 0, n = 0
  for (const m of String(label || '').matchAll(GAP)) {
    if (m.index! > at) out.push({ text: label.slice(at, m.index) })
    out.push({ gap: n++, hint: (m[1] ?? '').trim() })
    at = m.index! + m[0].length
  }
  if (at < String(label || '').length) out.push({ text: label.slice(at) })
  return out
}
export const gapCount = (label: string) => gapParts(label).filter(p => 'gap' in p).length
/** The sentence as it was completed, each blank filled with its answer. */
export function gapsFilled(label: string, v: unknown): string {
  const a = Array.isArray(v) ? v : []
  return gapParts(label).map(p => 'gap' in p ? (String(a[p.gap] ?? '').trim() || '___') : p.text).join('')
}
export const GAP_MAX = 300
/** An upload question takes pictures and PDFs, a few to a question. Photos
    are made smaller on the phone before they are sent. */
// pictures arrive as JPEG whatever the phone took (the page converts them),
// so the PDF of a response can show every one of them
export const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
export const FILE_MAX_COUNT = 5
export const FILE_MAX_BYTES = 10 * 1024 * 1024
/** The types whose answer is picked from a list the administrator writes. */
export const WITH_OPTIONS: FieldType[] = ['radio', 'checkbox', 'select']
/** A yes/no question: a choice whose two answers are always these. */
export const YES_NO = ['Ναι', 'Όχι']
/** Every type answered by picking — what a condition can depend on. */
export const CHOICE_TYPES: FieldType[] = [...WITH_OPTIONS, 'yesno']
/** What a condition can depend on: a choice, or an automatic field's result. */
export const COND_TYPES: FieldType[] = [...CHOICE_TYPES, 'calc']

/* An automatic field: read-only, filled from an earlier answer by rules —
   an option of a choice question gives a text; a number, or the age from a
   date of birth, falls in a range that gives a text. "Age 7–10 → Αγέλη".
   The age is counted on the day the form is filled in, on 31 December of
   that year, or on a set date. The result is kept with the answers, worked
   out again by the server, and other questions may depend on it. */
export type CalcRule = { match?: string, min?: number | null, max?: number | null, text: string }
export type FormCalc = { from: string, rules: CalcRule[], asOf?: string, otherwise?: string }
export const CALC_SOURCES: FieldType[] = [...CHOICE_TYPES, 'number', 'date']
export const calcMode = (srcType?: FieldType) => srcType === 'date' ? 'age' : srcType === 'number' ? 'range' : 'match'

/** Whole years from a date of birth to a day ('' today, 'yearEnd' 31/12 of
    this year, or 'YYYY-MM-DD'). */
export function ageOn(birth: string, asOf = '', today = new Date()): number | null {
  const b = String(birth || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!b) return null
  const t = asOf === 'yearEnd' ? [today.getFullYear(), 12, 31]
    : /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf.split('-').map(Number)
    : [today.getFullYear(), today.getMonth() + 1, today.getDate()]
  let age = t[0] - +b[1]
  if (t[1] < +b[2] || (t[1] === +b[2] && t[2] < +b[3])) age--
  return age >= 0 && age < 130 ? age : null
}

/** An automatic field's text for the answer it reads, or '' (or its
    "otherwise") when nothing matches. */
export function calcValue(calc: FormCalc, srcType: FieldType | undefined, v: unknown, today = new Date()): string {
  const empty = Array.isArray(v) ? !v.length : !String(v ?? '').trim()
  if (empty) return ''
  const mode = calcMode(srcType)
  let hit: CalcRule | undefined
  if (mode === 'match') {
    const vals = Array.isArray(v) ? v.map(String) : [String(v)]
    hit = calc.rules.find(r => r.match != null && vals.includes(r.match))
  } else {
    const n = mode === 'age' ? ageOn(String(v), calc.asOf || '') : Number(String(v).replace(',', '.'))
    if (n != null && !Number.isNaN(n))
      hit = calc.rules.find(r => (r.min == null || n >= r.min) && (r.max == null || n <= r.max))
  }
  return (hit?.text ?? calc.otherwise ?? '').trim()
}

/** Works every automatic field out from the answers it reads, in place —
    a repeated one from the same copy's answer (the second child's sector from
    the second child's age). Returns whether anything changed. */
export function fillCalc(spec: FormSpec, answers: Record<string, any>, repeats?: Record<string, number>, today = new Date()): boolean {
  const byId = new Map(spec.modules.flatMap(m => m.questions).map(q => [q.id, q]))
  let changed = false
  for (const inst of instances(spec, repeats)) for (const q of inst.m.questions) {
    if (q.type !== 'calc' || !q.calc) continue
    const src = byId.get(q.calc.from)
    const own = q.calc.from + inst.sfx
    const v = answers[own] !== undefined ? answers[own] : answers[q.calc.from]
    const key = q.id + inst.sfx
    const val = calcValue(q.calc, src?.type, v, today)
    if (answers[key] !== val) { answers[key] = val; changed = true }
  }
  return changed
}

/** Shown only when an earlier choice question has one of these answers —
    so a family registering again skips what is only asked the first time. */
export type FormCondition = { q: string, anyOf: string[] }
export type FormQuestion = { id: string, type: FieldType, label: string, help?: string, required: boolean, options: string[], showIf?: FormCondition, calc?: FormCalc }
/** A run of sections answered again for each of several — each child in a
    registration. Set on the run's first section: what each copy is called
    ("Παιδί" → Παιδί 1, Παιδί 2…), the section the run ends with, the question
    asked after each copy, and how many copies at most. */
export type FormRepeat = { label: string, until: string, ask: string, max: number }
export type FormModule = { id: string, title: string, description?: string, questions: FormQuestion[], showIf?: FormCondition, repeat?: FormRepeat }
export const REPEAT_MAX = 10
export type FormTick = { id: string, label: string, required: boolean }
export type FormSpec = {
  modules: FormModule[]
  ticks: FormTick[]
  signature: { enabled: boolean, required: boolean, label: string }
  /** a copy of the answers (the PDF, and the files they uploaded) is emailed
      to the address given in this Email question */
  emailCopy?: { q: string }
}
/** What someone sends back. */
export type FormAnswers = {
  answers: Record<string, string | string[]>
  ticks: Record<string, boolean>
  signature?: string | null
  /** how many copies of each repeated run were filled in, by its first section */
  repeats?: Record<string, number>
  /** who signed, written under the signature, and when — the moment it was sent */
  signerName?: string | null
  signedAt?: string | null
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
  const rawRepeat = new Map<object, any>()
  const rawCalc = new Map<object, any>()
  const modules: FormModule[] = (Array.isArray(raw?.modules) ? raw.modules : []).slice(0, 40).map((m: any) => keep({
    id: id(m?.id),
    title: str(m?.title, 200),
    description: str(m?.description, 2000) || undefined,
    questions: (Array.isArray(m?.questions) ? m.questions : []).slice(0, 100)
      .filter((q: any) => FIELD_TYPES.includes(q?.type))
      .map((q: any) => keep({
        id: id(q?.id),
        type: q.type as FieldType,
        label: str(q?.label, q?.type === 'gaps' ? 3000 : 500),
        help: str(q?.help, 1000) || undefined,
        required: !!q?.required,
        options: q.type === 'yesno' ? [...YES_NO] : WITH_OPTIONS.includes(q.type)
          ? [...new Set((Array.isArray(q?.options) ? q.options : []).map((o: any) => str(o, 200)).filter(Boolean))].slice(0, 60) as string[]
          : []
      }, q?.showIf, undefined, q?.calc))
  }, m?.showIf, m?.repeat))
  function keep<T extends object>(x: T, showIf: any, repeat?: any, calc?: any): T { raws.set(x, showIf); if (repeat) rawRepeat.set(x, repeat); if (calc) rawCalc.set(x, calc); return x }
  // repeated runs: from the section that says so through the one it names,
  // never starting inside another run
  let insideUntil = -1
  modules.forEach((m, i) => {
    const r = rawRepeat.get(m)
    if (i <= insideUntil || !r) return
    let end = modules.findIndex(x => x.id === r.until)
    if (end < i) end = i
    m.repeat = {
      label: str(r.label, 40) || 'Παιδί',
      until: modules[end].id,
      ask: str(r.ask, 200),
      max: Math.min(REPEAT_MAX, Math.max(2, Number(r.max) || 6))
    }
    insideUntil = end
  })
  // a condition must name a choice question that comes before it, and some
  // of that question's options; anything else is dropped, never guessed at
  const before: FormQuestion[] = []
  const cond = (c: any, pool: FormQuestion[]): FormCondition | undefined => {
    const src = pool.find(q => q.id === c?.q)
    if (!src || !COND_TYPES.includes(src.type)) return undefined
    const anyOf = (Array.isArray(c?.anyOf) ? c.anyOf : []).map((x: any) => String(x)).filter((x: string) => src.options.includes(x))
    return anyOf.length ? { q: src.id, anyOf } : undefined
  }
  for (const m of modules) {
    const c = cond(raws.get(m), before)
    if (c) m.showIf = c
    for (const q of m.questions) {
      // an automatic field reads an earlier choice, number or date; its
      // possible results are its "options", for conditions on it
      if (q.type === 'calc') {
        const c = rawCalc.get(q)
        const src = before.find(x => x.id === c?.from && CALC_SOURCES.includes(x.type))
        if (src) {
          const mode = calcMode(src.type)
          const num = (x: any) => x === '' || x == null || Number.isNaN(Number(x)) ? null : Number(x)
          const rules: CalcRule[] = (Array.isArray(c.rules) ? c.rules : []).slice(0, 60).map((r: any) => mode === 'match'
            ? { match: str(r?.match, 200), text: str(r?.text, 300) }
            : { min: num(r?.min), max: num(r?.max), text: str(r?.text, 300) })
            .filter((r: CalcRule) => r.text && (mode !== 'match' || src.options.includes(r.match!)))
          const asOf = c.asOf === 'yearEnd' || /^\d{4}-\d{2}-\d{2}$/.test(String(c.asOf || '')) ? String(c.asOf) : ''
          q.calc = { from: src.id, rules, ...(mode === 'age' && asOf ? { asOf } : {}), ...(str(c.otherwise, 300) ? { otherwise: str(c.otherwise, 300) } : {}) }
          q.options = [...new Set([...rules.map(r => r.text), ...(q.calc.otherwise ? [q.calc.otherwise] : [])])]
        } else q.calc = { from: '', rules: [] }
        q.required = false
      }
      const qc = cond(raws.get(q), before)
      if (qc) q.showIf = qc
      before.push(q)
    }
  }
  const ticks = (Array.isArray(raw?.ticks) ? raw.ticks : []).slice(0, 30)
    .map((x: any) => ({ id: id(x?.id), label: str(x?.label, 2000), required: !!x?.required }))
  const sig = raw?.signature || {}
  const out: FormSpec = {
    modules, ticks,
    signature: { enabled: !!sig.enabled, required: sig.required !== false, label: str(sig.label, 300) }
  }
  // the copy goes to one Email question that is asked once, not per child
  const copyQ = String(raw?.emailCopy?.q || '')
  if (copyQ && emailCopySources(out).some(q => q.id === copyQ)) out.emailCopy = { q: copyQ }
  return out
}

/** The questions a copy of the answers can be emailed to: the Email
    questions outside any repeated run. */
export function emailCopySources(spec: FormSpec): FormQuestion[] {
  const inRun = new Set<string>()
  for (const g of repeatGroups(spec)) for (let j = g.start; j <= g.end; j++) for (const q of spec.modules[j].questions) inRun.add(q.id)
  return spec.modules.flatMap(m => m.questions).filter(q => q.type === 'email' && !inRun.has(q.id))
}

/** Where this response's copy goes, if the form sends one and the address
    given looks like one. */
export function emailCopyAddress(spec: FormSpec, answers: Record<string, unknown>): string | null {
  if (!spec.emailCopy) return null
  const v = String(answers?.[spec.emailCopy.q] ?? '').trim()
  return EMAIL.test(v) ? v : null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[+\d][\d\s()-]{5,}$/

/** One question's answer checked; the error to show, or null. */
export function questionError(q: FormQuestion, v: unknown): string | null {
  const empty = Array.isArray(v) ? v.every(x => !String(x ?? '').trim()) : !String(v ?? '').trim()
  if (empty) return q.required ? 'required' : null
  if (q.type === 'checkbox') {
    if (!Array.isArray(v) || v.some(x => !q.options.includes(String(x)))) return 'invalid'
    return null
  }
  if (q.type === 'calc') return null
  if (q.type === 'child') return String(v).trim().length > 120 ? 'invalid' : null
  if (q.type === 'gaps') {
    // every blank answered when the question is required, and none too long
    const a = Array.isArray(v) ? v.map(x => String(x ?? '').trim()) : []
    if (a.length !== gapCount(q.label) || a.some(x => x.length > GAP_MAX)) return 'invalid'
    if (q.required && a.some(x => !x)) return 'required'
    return null
  }
  if (q.type === 'file') {
    if (!Array.isArray(v) || v.length > FILE_MAX_COUNT || v.some(x => !/^[a-z0-9:]{4,80}$/i.test(String(x)))) return 'invalid'
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

/** The repeated runs of a form: where each starts and ends, and its settings. */
export type RepeatGroup = { id: string, start: number, end: number, repeat: FormRepeat }
export function repeatGroups(spec: FormSpec): RepeatGroup[] {
  const out: RepeatGroup[] = []
  spec.modules.forEach((m, i) => {
    if (!m.repeat) return
    const end = Math.max(i, spec.modules.findIndex(x => x.id === m.repeat!.until))
    out.push({ id: m.id, start: i, end, repeat: m.repeat })
  })
  return out
}
/** How many copies of a run were filled in: at least one, at most its max. */
export const copiesOf = (g: RepeatGroup, repeats?: Record<string, number>) =>
  Math.min(g.repeat.max, Math.max(1, Math.floor(Number(repeats?.[g.id]) || 1)))

/** One section as the person meets it: a plain section once, a repeated one
    once per copy. A copy's answers are kept under the question's id with
    "@<copy>" after it, so the second child's name is "name@2". */
export type Instance = { m: FormModule, group: RepeatGroup | null, copy: number, sfx: string, key: string }
export function instances(spec: FormSpec, repeats?: Record<string, number>): Instance[] {
  const groups = repeatGroups(spec)
  const out: Instance[] = []
  for (let i = 0; i < spec.modules.length; i++) {
    const g = groups.find(x => x.start === i)
    if (!g) { out.push({ m: spec.modules[i], group: null, copy: 0, sfx: '', key: spec.modules[i].id }); continue }
    for (let n = 1; n <= copiesOf(g, repeats); n++)
      for (let j = g.start; j <= g.end; j++)
        out.push({ m: spec.modules[j], group: g, copy: n, sfx: `@${n}`, key: `${spec.modules[j].id}@${n}` })
    i = g.end
  }
  return out
}
/** A section's heading as the person meets it: "Παιδί 2 · Στοιχεία παιδιού". */
export function instanceTitle(inst: Instance): string {
  if (!inst.group) return inst.m.title
  const who = `${inst.group.repeat.label} ${inst.copy}`
  return inst.m.title ? `${who} · ${inst.m.title}` : who
}
/** The question an answer key belongs to: "name@2" → "name". */
export const baseId = (key: string) => key.split('@')[0]

/** Which sections (by instance key) and answers (by answer key) these answers
    show. In form order, so a condition on a question that is itself hidden
    counts as not met. Inside a copy, a condition on a question of the same run
    looks at that copy's answer; outside, at the first copy's. */
export function visibleParts(spec: FormSpec, answers: Record<string, any>, repeats?: Record<string, number>) {
  const modules = new Set<string>()
  const questions = new Set<string>()
  const shown: Instance[] = []
  const groupOf = new Map<string, RepeatGroup>()
  for (const g of repeatGroups(spec)) for (let j = g.start; j <= g.end; j++) for (const q of spec.modules[j].questions) groupOf.set(q.id, g)
  const holds = (c: FormCondition, key: string) => {
    if (!questions.has(key)) return false
    const v = answers?.[key]
    return Array.isArray(v) ? v.some(x => c.anyOf.includes(String(x))) : c.anyOf.includes(String(v ?? ''))
  }
  /* A condition on a repeated question reads the same copy: the second
     child's section follows the second child's answer — in its own run or in
     another one. From a section that is not repeated, any child's answer
     counts. */
  const met = (c: FormCondition | undefined, inst: Instance) => {
    if (!c) return true
    const g = groupOf.get(c.q)
    if (!g) return holds(c, c.q)
    if (inst.group) return holds(c, c.q + inst.sfx)
    for (let n = 1; n <= copiesOf(g, repeats); n++) if (holds(c, `${c.q}@${n}`)) return true
    return false
  }
  for (const inst of instances(spec, repeats)) {
    if (!met(inst.m.showIf, inst)) continue
    modules.add(inst.key)
    shown.push(inst)
    for (const q of inst.m.questions) if (met(q.showIf, inst)) questions.add(q.id + inst.sfx)
  }
  return { modules, questions, shown }
}

/** The answers kept, cleaned, plus every problem by question id. Only what
    the answers show is checked or kept: a hidden question is never required,
    and anything typed into it before it was hidden is let go. */
export function checkAnswers(spec: FormSpec, body: any): { clean: FormAnswers, errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const answers: Record<string, string | string[]> = {}
  // how many copies of each run: as many as were filled in, within its limit
  const repeats: Record<string, number> = {}
  for (const g of repeatGroups(spec)) repeats[g.id] = copiesOf(g, body?.repeats)
  // the automatic fields worked out here, whatever the page sent for them
  const given: Record<string, any> = { ...(body?.answers || {}) }
  fillCalc(spec, given, repeats)
  body = { ...body, answers: given }
  const vis = visibleParts(spec, body?.answers || {}, repeats)
  for (const inst of vis.shown) for (const q of inst.m.questions) {
    const key = q.id + inst.sfx
    if (!vis.questions.has(key)) continue
    let v = body?.answers?.[key]
    if (q.type === 'checkbox' || q.type === 'file') v = Array.isArray(v) ? v.map(x => String(x)) : []
    else if (q.type === 'gaps') {
      // one answer per blank, however many were sent
      const a = Array.isArray(v) ? v : []
      v = Array.from({ length: gapCount(q.label) }, (_, i) => String(a[i] ?? '').trim().slice(0, GAP_MAX))
    } else v = String(v ?? '').slice(0, q.type === 'textarea' ? 5000 : 500)
    const e = questionError(q, v)
    if (e) errors[key] = e
    const has = Array.isArray(v) ? (q.type === 'gaps' ? v.some(x => x) : v.length) : String(v).trim()
    if (has) answers[key] = Array.isArray(v) ? v : String(v).trim()
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
  // whoever signs writes their name under it
  let signerName: string | null = null
  if (spec.signature.enabled) {
    signerName = String(body?.signerName ?? '').trim().slice(0, 120) || null
    if (!signerName && (signature || spec.signature.required)) errors.signerName = 'required'
  }
  return { clean: { answers, ticks, signature, signerName, ...(Object.keys(repeats).length ? { repeats } : {}) }, errors }
}

/** An answer as text, for tables and the export — a date the Greek way. */
export function answerText(v: unknown, type?: FieldType, fileNames?: Record<string, string>): string {
  if (type === 'file' && Array.isArray(v)) return v.map(x => fileNames?.[x] ?? '📎').join(', ')
  if (type === 'gaps' && Array.isArray(v)) return v.some(x => String(x ?? '').trim()) ? v.map(x => String(x ?? '').trim() || '—').join(' · ') : ''
  if (Array.isArray(v)) return v.join(', ')
  const s = String(v ?? '')
  const d = type === 'date' && s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return d ? `${d[3]}/${d[2]}/${d[1]}` : s
}
