import { idParam } from '../../../../utils/guard'
import { formForLeader } from '../../../../utils/forms'
import { inviteStatus } from '../../../../utils/familyForms'

/** The parents a form was sent to: who has answered and who has not yet. */
export default defineEventHandler(async (event) => {
  const { f } = await formForLeader(event, idParam(event))
  return inviteStatus(f.id)
})
