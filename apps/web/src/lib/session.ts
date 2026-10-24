import { auth } from "@/lib/auth";

export async function getSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.BETTER_AUTH_URL ?? "http://localhost:3200";
  return origin === new URL(expected).origin;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
