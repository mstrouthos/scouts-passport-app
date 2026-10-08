import { requireShopManager, setTrackStock } from '../../../utils/shop'

/** The shop's own switches, kept by whoever runs it: for now, whether it counts its stock. */
export default defineEventHandler(async (event) => {
  await requireShopManager(event)
  const b = await readBody<{ trackStock?: boolean }>(event)
  if (typeof b?.trackStock === 'boolean') await setTrackStock(b.trackStock)
  return { ok: true }
})
