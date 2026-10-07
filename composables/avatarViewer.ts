import type { Avatar } from '~/utils/avatar'

/* One full-screen viewer for the whole app: tapping someone's avatar or
   photo opens it there, big, with their name. */
export type AvatarView = { name: string, photo?: string | null, avatar?: Partial<Avatar> | null, party?: boolean }
export const useAvatarViewer = () => useState<AvatarView | null>('avatar-viewer', () => null)
export function openAvatar(v: AvatarView) { useAvatarViewer().value = v }
