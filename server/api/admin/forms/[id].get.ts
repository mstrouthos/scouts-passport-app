import { requireTroopLeader, idParam } from '../../../utils/guard'
import { formById, specOf, isAccepting } from '../../../utils/forms'
import { emailReady } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  await requireTroopLeader(event)
  const f = await formById(idParam(event))
  return {
    id: f.id, slug: f.slug, titleEl: f.titleEl, introEl: f.introEl, thanksEl: f.thanksEl, thanksTitleEl: f.thanksTitleEl,
    isOpen: f.isOpen, closesAt: f.closesAt, accepting: isAccepting(f), spec: specOf(f),
    // whether the server can send the copy by email at all
    emailReady: emailReady()
  }
})
