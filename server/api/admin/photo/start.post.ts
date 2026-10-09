import { requireTroopLeader } from '../../../utils/guard'
import { startPhotoRound } from '../../../utils/photoGame'

/** An admin asks for a photo now, outside the twice-a-week rounds. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const started = await startPhotoRound(me.id)
  if (!started) throw createError({ statusCode: 409, message: 'Υπάρχει ήδη πρόκληση σε εξέλιξη 📸' })
  return { ok: true, thing: started.thing.el }
})
