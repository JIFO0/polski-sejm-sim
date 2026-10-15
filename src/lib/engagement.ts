export const FEEDBACK_INVITATION_DELAY = 4 * 60 * 1000;
export const FEEDBACK_INVITATION_KEY = "sejmsim.feedback-invitation.v1";

export function invitationDue(startedAt: number, now: number, alreadyShown: boolean) {
  return !alreadyShown && now - startedAt >= FEEDBACK_INVITATION_DELAY;
}