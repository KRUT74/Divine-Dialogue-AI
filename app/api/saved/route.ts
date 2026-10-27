import { z } from "zod"
import { SavedItemSchema } from "@/lib/schemas"
import { addSaved, listSaved, removeSaved } from "@/lib/server/accounts"
import { accountIdOf, getVisitor } from "@/lib/server/visitor"

// Saved items for a signed-in account. Guests keep theirs in the browser instead.

async function accountId(req: Request) {
  return accountIdOf(await getVisitor(req))
}

const signedOut = () => Response.json({ error: "Please sign in to sync saved items." }, { status: 401 })
const failed = (error: unknown) => {
  console.error("Saved items request failed", error)
  return Response.json({ error: "Couldn't update saved items. Please try again." }, { status: 503 })
}

export async function GET(req: Request) {
  const id = await accountId(req)
  if (!id) return signedOut()
  try {
    return Response.json({ savedItems: await listSaved(id) }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return failed(error)
  }
}

export async function POST(req: Request) {
  const id = await accountId(req)
  if (!id) return signedOut()
  const parsed = SavedItemSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "That item couldn't be saved." }, { status: 400 })
  try {
    await addSaved(id, [parsed.data])
    return Response.json({ saved: true })
  } catch (error) {
    return failed(error)
  }
}

export async function DELETE(req: Request) {
  const id = await accountId(req)
  if (!id) return signedOut()
  const itemId = z.uuid().safeParse(new URL(req.url).searchParams.get("id"))
  if (!itemId.success) return Response.json({ error: "Unknown item." }, { status: 400 })
  try {
    await removeSaved(id, itemId.data)
    return Response.json({ removed: true })
  } catch (error) {
    return failed(error)
  }
}
