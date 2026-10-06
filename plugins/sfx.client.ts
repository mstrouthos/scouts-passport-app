import { unlockAudio } from '~/composables/sfx'

/* Phones keep a page silent until it is touched: the first touch anywhere
   wakes the sound, so the next "ding" is heard. */
export default defineNuxtPlugin(() => {
  const wake = () => { unlockAudio(); window.removeEventListener('pointerdown', wake, true) }
  window.addEventListener('pointerdown', wake, true)
})
