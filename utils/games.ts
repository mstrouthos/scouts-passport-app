/* The Βαθμοφόροι's mini-games, each a full screen of its own, and the
   notifications that belong to each: these stay out of the bell (which keeps
   to what matters — events, polls, forms) and wait in the game they came
   from. Shared by the server (where a notification belongs, where it opens)
   and the pages (the dashboard tiles, each game's own 🔔). */

export type GameKey = 'throw' | 'potato' | 'kim' | 'north'

export const GAMES: Record<GameKey, { path: string, icon: string, emoji: string }> = {
  throw: { path: '/admin/play', icon: '/images/games/throw.webp', emoji: '🍅' },
  potato: { path: '/admin/potato', icon: '/images/games/potato.webp', emoji: '🥔' },
  kim: { path: '/admin/kim', icon: '/images/games/kim.webp', emoji: '🧠' },
  north: { path: '/admin/north', icon: '/images/games/north.webp', emoji: '🧭' }
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

/** What each game adds to the general table: a throw of the potato, and — for
    everyone playing the potato when a round bursts, but the one it burst on,
    whether they ever held it or not — surviving it; a thing remembered on
    Kim's tray; the Βορράς counts its own 0–100 a day. Σπλατς is left out: it
    is for fun, and what it throws was won in the other games. */
export const GAME_RANK = { potatoPass: 1, potatoSurvive: 2, kimPerThing: 25 }
