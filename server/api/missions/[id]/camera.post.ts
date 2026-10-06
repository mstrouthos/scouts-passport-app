import { requireScout, idParam } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { isOpenFor, isFor, memberSection, missionById, cameraTicket } from '../../../utils/missions'

/** The member opens the app's camera for a mission: a ticket for the photo
    they are about to take. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  if (me.role !== 'scout') throw createError({ statusCode: 403, message: 'Μόνο για μέλη' })
  const m = await missionById(idParam(event))
  if (!isFor(m, await memberSection(me)) || !isOpenFor(m, now(), me)) throw createError({ statusCode: 400, message: 'Η αποστολή έχει κλείσει' })
  return { ticket: cameraTicket(me.id, m.id) }
})
