import { useDb, schema as s } from '../../db'
import { requireTroopLeader } from '../../utils/guard'
import { specOf } from '../../utils/forms'

/** The templates new forms can start from, newest first. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const db = await useDb()
  return (await db.select().from(s.formTemplates))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(x => {
      const spec = specOf(x)
      return { id: x.id, name: x.name, createdAt: x.createdAt, modules: spec.modules.length, questions: spec.modules.reduce((n, m) => n + m.questions.length, 0) }
    })
})
