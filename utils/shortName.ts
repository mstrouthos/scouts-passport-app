/** A Βαθμοφόρος's name where space is short — the first name and the initial
    of the surname («Νίκος Π.») — so two of the same first name can be told apart. */
export function shortName(p: { firstName?: string | null, lastName?: string | null } | null | undefined): string {
  const first = String(p?.firstName || '').trim()
  const last = String(p?.lastName || '').trim()
  return last ? `${first} ${last[0]!.toLocaleUpperCase('el')}.` : first
}
