import { idParam } from '../../../utils/guard'
import { formForLeader, specOf, isAccepting, isArchigosFor, formSections } from '../../../utils/forms'
import { useDb, schema as s } from '../../../db'
import { emailReady } from '../../../utils/email'
import { parentSectionsOf } from '../../../utils/familyForms'
import { scoutYear } from '../../../../utils/scoutYear'

export default defineEventHandler(async (event) => {
  const { me, f } = await formForLeader(event, idParam(event))
  const secs = await formSections(me)
  const db = await useDb()
  return {
    id: f.id, slug: f.slug, titleEl: f.titleEl, introEl: f.introEl, thanksEl: f.thanksEl, thanksTitleEl: f.thanksTitleEl,
    isOpen: f.isOpen, closesAt: f.closesAt, accepting: isAccepting(f), spec: specOf(f),
    // whether the server can send the copy by email at all
    emailReady: emailReady(),
    sectionId: f.sectionId, pendingApproval: f.pendingApproval,
    // whether this leader may approve it, and open it without asking
    canApprove: await isArchigosFor(me, f.sectionId),
    // the sectors it may be moved to, and whose parents it may be sent to
    sections: (await db.select().from(s.sections)).filter(x => secs === null || secs.includes(x.id))
      .sort((a, b) => a.sortOrder - b.sortOrder).map(x => ({ id: x.id, nameEl: x.nameEl })),
    allSections: secs === null,
    // the sectors whose parents see it, and when they were last told
    parentSections: parentSectionsOf(f), parentsNotifiedAt: f.parentsNotifiedAt,
    // the scout year it registers members for, if it does; and this year's
    registrationYear: f.registrationYear, thisYear: scoutYear()
  }
})
