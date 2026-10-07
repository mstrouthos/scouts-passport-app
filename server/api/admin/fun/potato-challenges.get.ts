import { requireLeader } from '../../../utils/guard'
import { potatoChallenges } from '../../../utils/leaderFun'

/** The challenges a burst potato hands out — anyone may read them. */
export default defineEventHandler(async (event) => {
  await requireLeader(event)
  return { challenges: await potatoChallenges() }
})
