import { getSession, jsonError, sameOrigin } from "@/lib/session";
import { WorkspaceError } from "@/lib/workspace";

export async function userRoute(request: Request, handler: (userId: string) => Promise<unknown>, write = false) {
  if (write && !sameOrigin(request)) return jsonError("İstek kaynağı doğrulanamadı.", 403);
  const session = await getSession(request);
  if (!session) return jsonError("Oturum açmanız gerekiyor.", 401);
  try {
    return Response.json(await handler(session.id));
  } catch (error) {
    if (error instanceof WorkspaceError) return jsonError(error.message, error.status);
    console.error("Workspace API error", error instanceof Error ? error.message : "unknown");
    return jsonError("İşlem tamamlanamadı.", 500);
  }
}

export async function requestBody(request: Request) {
  try { return await request.json() as Record<string, unknown>; }
  catch { throw new WorkspaceError(400, "Geçerli JSON gövdesi gerekli."); }
}

export function requiredText(body: Record<string, unknown>, key: string, max: number) {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new WorkspaceError(400, `Geçersiz ${key} alanı.`);
  return value.trim();
}

export function expectedVersion(body: Record<string, unknown>) {
  const value = body.expectedVersion;
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new WorkspaceError(400, "expectedVersion pozitif bir tam sayı olmalı.");
  return Number(value);
}

export function requiredUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new WorkspaceError(400, "Geçersiz kimlik biçimi.");
  }
  return value;
}
