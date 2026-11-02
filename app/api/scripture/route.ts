import { ScriptureRequest, type Reading } from "@/lib/schemas"
import { errorResponse } from "@/lib/server/anthropic"
import { chooseMatchingPassage, explainPassage, findPassageReferences } from "@/lib/server/guide"
import { checkAllowed, guard, record } from "@/lib/server/limits"
import { getPassage, type PassageResult } from "@/lib/server/scripture"
import { getVisitor } from "@/lib/server/visitor"

export const maxDuration = 60

export async function POST(req: Request) {
  const parsed = ScriptureRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Choose a text and type what you're looking for." }, { status: 400 })
  const { faith, language, work, reference: search } = parsed.data

  const visitor = await getVisitor(req)
  const refused = await guard(() => checkAllowed(visitor, "read"))
  if (refused) return refused

  let costUsd = 0
  try {
    // Something that looks like a reference is tried as one first; anything else is searched for.
    let result: PassageResult | null = /\d/.test(search) ? await getPassage(work, search, language) : null
    if (!result?.ok) {
      const found = await findPassageReferences(faith, work, search)
      costUsd += found.costUsd
      const fetched = (await Promise.all(found.candidates.map((c) => getPassage(c.work, c.reference, language)))).flatMap(
        (r) => (r.ok ? [r.passage] : []),
      )
      if (fetched.length) {
        const choice = await chooseMatchingPassage(search, fetched)
        costUsd += choice.costUsd
        result = choice.index >= 0 ? { ok: true, passage: fetched[choice.index] } : null
      }
    }
    if (!result?.ok) {
      await record("read", visitor, costUsd)
      return Response.json(
        { error: "Couldn't find a passage matching that. Try other words you remember, a topic, or a reference." },
        { status: 404 },
      )
    }

    const passage = { id: 1, ...result.passage }
    const explained = await explainPassage(faith, language, passage)
    await record("read", visitor, costUsd + explained.costUsd)
    const reading: Reading = { passage, explanation: explained.text }
    return Response.json(reading)
  } catch (error) {
    await record("read", visitor, costUsd)
    return errorResponse(error, "The passage couldn't be found or explained just now. Please try again.")
  }
}
