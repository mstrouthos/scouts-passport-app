/* The Βαθμοφόροι's mini-games, each a full screen of its own, and the
   notifications that belong to each: these stay out of the bell (which keeps
   to what matters — events, polls, forms) and wait in the game they came
   from. Shared by the server (where a notification belongs, where it opens)
   and the pages (the dashboard tiles, each game's own 🔔). */

export type GameKey = 'throw' | 'potato' | 'kim' | 'north' | 'flag'

export const GAMES: Record<GameKey, { path: string, icon: string, emoji: string }> = {
  throw: { path: '/admin/play', icon: '/images/games/throw.webp', emoji: '🍅' },
  potato: { path: '/admin/potato', icon: '/images/games/potato.webp', emoji: '🥔' },
  kim: { path: '/admin/kim', icon: '/images/games/kim.webp', emoji: '🧠' },
  north: { path: '/admin/north', icon: '/images/games/north.webp', emoji: '🧭' },
  flag: { path: '/admin/flag', icon: '/images/games/flag.webp', emoji: '🇬🇷' }
}
/** The one still to come, shown greyed out on the dashboard. */
export const GAME_SOON_ICON = '/images/games/camp.webp'

/** Which game a notification kind belongs to. */
export const GAME_OF_KIND: Record<string, GameKey> = {
  'fun': 'throw', 'fun-warn': 'throw', 'fun-daily': 'throw', 'fun-refill': 'throw', 'fun-gift': 'throw',
  'potato': 'potato', 'potato-pass': 'potato', 'potato-burst': 'potato',
  'kim': 'kim',
  'flag': 'flag'
}
export const GAME_KINDS = Object.keys(GAME_OF_KIND)
export const kindsOfGame = (g: GameKey) => GAME_KINDS.filter(k => GAME_OF_KIND[k] === g)
export const isGameKind = (kind: string) => kind in GAME_OF_KIND
export const isGameKey = (g: unknown): g is GameKey => typeof g === 'string' && g in GAMES

/** What each game adds to the general table — kept small, so no one game
    swamps the rest: the Βορράς its own 0–100 a day divided by 10 (0–10); a
    thing remembered on Kim's tray 5 (20 a day at most); a throw of the potato
    1, and 2 for everyone playing it when a round bursts but the one it burst
    on (held it or not); and the flag 5 for raising it, 5 for lowering it, and
    2 more to whoever does both on the same day. Σπλατς scores nothing:
    banter is not points. */
export const GAME_RANK = { northDiv: 10, kimPerThing: 5, potatoPass: 1, potatoSurvive: 2, flagRaise: 5, flagLower: 5, flagBoth: 2 }

/** Έπαρση Σημαίας: the haul is the race — this many quick taps on the rope;
    and no quicker than this, nor slower (one started is dropped after it). */
export const FLAG_TAPS = 20
export const FLAG_MIN_HAUL_MS = 2000
export const FLAG_MAX_HAUL_MS = 90_000
