/** Sign the crew member out without touching any other session on the
    device — a Βαθμοφόρος may well be a waiter for the night. */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const { bar, ...rest } = (session as any) || {}
  await replaceUserSession(event, rest)
  return { ok: true }
})
