/* Illustrated artwork (made with Higgsfield), served from public/images/art.
   A badge with no picture of its own — one added later — keeps its emoji. */
const BADGE_ART: readonly string[] = ["agroti", "aliea", "anarrichisis", "archaiologias", "astronomoy", "athliti", "cheirotechnias", "dasonomoy", "diaviosis", "dimosiografoy", "dimosion-scheseon", "energeiakis-oikonomias", "episkeyasti", "evdomis-technis", "exereyniti", "filathloy", "fotografoy", "fysiodifi", "grammatea", "ichnilati", "ilektronikoy", "katanaloti", "kataskinoti", "kataskinotikis-mageirikis", "kataskinotikis-technikis", "koinotikis-anaptyxis", "kolymviti", "mageira", "metafrasti", "meteorologoy", "montelisti", "moysikoy", "pagkosmias-filias", "pagkosmias-oikologias", "paratiriti", "perivallontos", "pliroforikis", "podilasias", "politistikis-klironomias", "proton-voitheion", "psychagogias", "pyroprostasias", "radioerasitechni", "skapanikis", "syggrafea", "technon", "thriskeias", "topografoy", "vivliofiloy", "xenagoy", "zografoy"]

/** The picture of a Πτυχίο, by its catalogue slug, or null. */
export const badgeArt = (slug?: string | null) => slug && BADGE_ART.includes(slug) ? `/images/art/badges/${slug}.webp` : null

/** The showcase picture of a limited-edition collection item. */
export const rewardArt = (key: string) => `/images/art/rewards/${key}.webp`

/** The phoenix in a pose: think, encourage, sleep, trophy, wave, camera. */
export const phoenixArt = (pose: 'think' | 'encourage' | 'sleep' | 'trophy' | 'wave' | 'camera') => `/images/art/phoenix/${pose}.webp`
