import { requireLeader, idParam, rankOf } from '../../../utils/guard'
import { eventVisible, canEditEvent, eventHasData } from '../../../utils/eventScope'

export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const id = idParam(event)
  const ev = await eventVisible(me, id)
  const editable = await canEditEvent(me, ev)
  const data = await eventHasData(id)
  const past = new Date(ev.endsAt || ev.startsAt).getTime() < Date.now()
  return {
    id: ev.id, scope: ev.scope, sectionId: ev.sectionId, patrolId: ev.patrolId,
    titleEl: ev.titleEl, titleEn: ev.titleEn, location: ev.location, themeEl: ev.themeEl, descriptionEl: ev.descriptionEl,
    groupId: ev.groupId,
    startsAt: ev.startsAt, endsAt: ev.endsAt, isAllDay: ev.isAllDay,
    tracksAttendance: ev.tracksAttendance, remindAt: ev.remindAt,
    past, recorded: data, editable,
    // a finished event that already has attendance/points is history — keep it
    // the Αρχηγός Συστήματος can clear up after a mistake regardless
    canDelete: editable && ((await rankOf(me)) === 'admin' || !(past && data.any))
  }
})
