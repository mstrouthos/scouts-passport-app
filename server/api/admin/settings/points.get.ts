import { requireLeader } from '../../../utils/guard'
import { getPointRules } from '../../../utils/settings'

export default defineEventHandler(async (event) => {
  await requireLeader(event)
  return getPointRules()
})
