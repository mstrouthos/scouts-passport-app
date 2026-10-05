import { normalizeAvatar } from '../../utils/avatar'

/** How a person appears: a Βαθμοφόρος's photo if they chose one, otherwise
    their avatar (members always, Βαθμοφόροι if they made one instead),
    otherwise nothing — and the app shows their initials. */
export function faceOf(r: { role: string, avatar?: string | null, photoFileId?: number | null }) {
  const photo = r.role !== 'scout' && r.photoFileId ? `/api/photo/${r.photoFileId}` : null
  let avatar = null
  if (!photo && r.avatar) { try { avatar = normalizeAvatar(JSON.parse(r.avatar)) } catch {} }
  return { photo, avatar }
}
