import { requireLeader } from '../../../utils/guard'

/** The Google Maps key, for the place picker's map and search. A browser key
    is seen by the browser that uses it anyway — Google locks it to the app's
    own address — so it is handed to signed-in leaders, who are the only ones
    choosing places. */
export default defineEventHandler(async (event) => {
  await requireLeader(event)
  return { key: useRuntimeConfig().googleMapsKey || null }
})
