import { signOut } from "@/lib/server/visitor"

export async function POST() {
  await signOut()
  return Response.json({ signedOut: true })
}
