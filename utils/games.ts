/* The Βαθμοφόροι's mini-games, each a full screen of its own, and the
   notifications that belong to each: these stay out of the bell (which keeps
   to what matters — events, polls, forms) and wait in the game they came
   from. Shared by the server (where a notification belongs, where it opens)
   and the pages (the dashboard tiles, each game's own 🔔). */

export type GameKey = 'throw' | 'potato' | 'kim'

export const GAMES: Record<GameKey, { path: string, icon: string, emoji: string }> = {
  throw: { path: '/admin/play', icon: '/images/games/throw.webp', emoji: '🍅' },
  potato: { path: '/admin/potato', icon: '/images/games/potato.webp', emoji: '🥔' },
  kim: { path: '/admin/kim', icon: '/images/games/kim.webp', emoji: '🧠' }
}
/** The one still to come, shown greyed out on the dashboard. */
export const GAME_SOON_ICON = '/images/games/camp.webp'

/** Which game a notification kind belongs to. */
export const GAME_OF_KIND: Record<string, GameKey> = {
  'fun': 'throw', 'fun-warn': 'throw', 'fun-daily': 'throw',
  'potato': 'potato', 'potato-pass': 'potato', 'potato-burst': 'potato',
  'kim': 'kim'
}
export const GAME_KINDS = Object.keys(GAME_OF_KIND)
export const kindsOfGame = (g: GameKey) => GAME_KINDS.filter(k => GAME_OF_KIND[k] === g)
export const isGameKind = (kind: string) => kind in GAME_OF_KIND
export const isGameKey = (g: unknown): g is GameKey => typeof g === 'string' && g in GAMES
