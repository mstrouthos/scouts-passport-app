/* Φωτογραφικό κυνήγι — twice a week, Monday to Friday, the game asks for a
   photo of something; the first three to photograph it (with the app's own
   camera, never from the gallery), as a check by Gemini confirms, win 5, 4
   and 3. Three tries each. Shared by the page and the server. */

/** Whether its points count in the general mini-games table: not while it is
    tried out by a few (it would give them an edge) — on when it opens to all. */
export const PHOTO_IN_RANK = false
/** What the first, second and third correct photo win. */
export const PHOTO_POINTS = [5, 4, 3]
/** Tries each, in a round. */
export const PHOTO_TRIES = 3
/** Rounds a week, on different days, Monday to Friday, between these hours (Cyprus). */
export const PHOTO_PER_WEEK = 2
export const PHOTO_HOURS = [9, 20]

/** What it may ask for: everyday things and a scout's own. `en` is what the
    photo is checked against; `el` is what everyone is told («ένα συρραπτικό»). */
export type PhotoThing = { key: string, el: string, en: string, emoji: string }
export const PHOTO_THINGS: PhotoThing[] = [
  { key: 'stapler', el: 'ένα συρραπτικό', en: 'a stapler', emoji: '📎' },
  { key: 'pen', el: 'ένα στυλό', en: 'a pen', emoji: '🖊️' },
  { key: 'glass', el: 'ένα ποτήρι', en: 'a drinking glass', emoji: '🥛' },
  { key: 'coffee', el: 'έναν καφέ', en: 'a cup of coffee', emoji: '☕' },
  { key: 'car', el: 'ένα αυτοκίνητο', en: 'a car', emoji: '🚗' },
  { key: 'bus', el: 'ένα λεωφορείο', en: 'a bus', emoji: '🚌' },
  { key: 'flagpole', el: 'έναν ιστό σημαίας', en: 'a flagpole', emoji: '🏳️' },
  { key: 'bicycle', el: 'ένα ποδήλατο', en: 'a bicycle', emoji: '🚲' },
  { key: 'umbrella', el: 'μια ομπρέλα', en: 'an umbrella', emoji: '☂️' },
  { key: 'keys', el: 'κλειδιά', en: 'a key or a bunch of keys', emoji: '🔑' },
  { key: 'book', el: 'ένα βιβλίο', en: 'a book', emoji: '📖' },
  { key: 'clock', el: 'ένα ρολόι', en: 'a clock or a watch', emoji: '⏰' },
  { key: 'plant', el: 'ένα φυτό σε γλάστρα', en: 'a potted plant', emoji: '🪴' },
  { key: 'shoe', el: 'ένα παπούτσι', en: 'a shoe', emoji: '👟' },
  { key: 'chair', el: 'μια καρέκλα', en: 'a chair', emoji: '🪑' },
  { key: 'spoon', el: 'ένα κουτάλι', en: 'a spoon', emoji: '🥄' },
  { key: 'scissors', el: 'ένα ψαλίδι', en: 'a pair of scissors', emoji: '✂️' },
  { key: 'sunglasses', el: 'γυαλιά ηλίου', en: 'a pair of sunglasses', emoji: '🕶️' },
  { key: 'banana', el: 'μια μπανάνα', en: 'a banana', emoji: '🍌' },
  { key: 'apple', el: 'ένα μήλο', en: 'an apple', emoji: '🍎' },
  { key: 'bottle', el: 'ένα μπουκάλι νερό', en: 'a bottle of water', emoji: '🧴' },
  { key: 'stopsign', el: 'μια πινακίδα STOP', en: 'a STOP road sign', emoji: '🛑' },
  { key: 'trafficlight', el: 'ένα φανάρι', en: 'a traffic light', emoji: '🚦' },
  { key: 'tree', el: 'έναν φοίνικα', en: 'a palm tree', emoji: '🌴' },
  { key: 'cat', el: 'μια γάτα', en: 'a cat', emoji: '🐈' },
  { key: 'ball', el: 'μια μπάλα', en: 'a ball', emoji: '⚽' },
  { key: 'mug', el: 'μια κούπα', en: 'a mug', emoji: '🍵' },
  { key: 'remote', el: 'ένα τηλεχειριστήριο', en: 'a remote control', emoji: '📺' },
  { key: 'toothbrush', el: 'μια οδοντόβουρτσα', en: 'a toothbrush', emoji: '🪥' },
  { key: 'bench', el: 'ένα παγκάκι', en: 'a bench', emoji: '🪑' },
  // a scout's own
  { key: 'compass', el: 'μια πυξίδα', en: 'a compass (for navigation)', emoji: '🧭' },
  { key: 'scarf', el: 'ένα προσκοπικό μαντήλι', en: 'a scout neckerchief (a folded triangular scarf)', emoji: '🧣' },
  { key: 'tent', el: 'μια σκηνή', en: 'a camping tent', emoji: '⛺' },
  { key: 'canteen', el: 'ένα παγούρι', en: 'a water canteen or flask', emoji: '🥤' },
  { key: 'knot', el: 'έναν κόμπο σε σχοινί', en: 'a rope tied in a knot', emoji: '🪢' },
  { key: 'flashlight', el: 'έναν φακό', en: 'a flashlight (torch)', emoji: '🔦' },
  { key: 'pocketknife', el: 'έναν σουγιά', en: 'a pocket knife', emoji: '🔪' },
  { key: 'map', el: 'έναν χάρτη', en: 'a paper map', emoji: '🗺️' },
  { key: 'whistle', el: 'μια σφυρίχτρα', en: 'a whistle', emoji: '📯' },
  { key: 'pinecone', el: 'ένα κουκουνάρι', en: 'a pine cone', emoji: '🌲' },
  { key: 'backpack', el: 'ένα σακίδιο', en: 'a backpack', emoji: '🎒' },
  { key: 'hat', el: 'ένα καπέλο', en: 'a hat or a cap', emoji: '🧢' },
  { key: 'rope', el: 'ένα σχοινί', en: 'a rope', emoji: '🪢' }
]
export const photoThing = (key: string) => PHOTO_THINGS.find(x => x.key === key) || null
