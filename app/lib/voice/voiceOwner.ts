// Only one thing in the app talks or listens at a time. Whatever starts next claims
// the voice, which stops whatever had it.
let owner: (() => void) | null = null

export function claimVoice(release: () => void) {
  if (owner && owner !== release) owner()
  owner = release
}
