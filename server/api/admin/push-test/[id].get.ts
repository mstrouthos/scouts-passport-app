import { requireTroopLeader } from '../../../utils/guard'
import { getTest } from '../../../utils/pushTest'

/** The report of a group test: per person, each device and what became of it. */
export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const test = getTest(String(getRouterParam(event, 'id')))
  if (!test) throw createError({ statusCode: 404, message: 'Test not found' })
  return {
    ageMs: Date.now() - test.at,
    people: test.people.map(p => ({
      ...p,
      devices: test.devices.filter(d => d.scoutId === p.scoutId)
        .map(d => ({ label: d.label, sent: d.sent, error: d.error, receivedMs: d.receivedMs }))
    }))
  }
})
