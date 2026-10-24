import { userRoute, requiredUuid, requestBody } from "@/lib/api";
import { createInvite, listRoomInvites, revokeInvite, WorkspaceError } from "@/lib/workspace";

type Context = { params: Promise<{ roomId: string }> };
export async function POST(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => {
    const body = await requestBody(request);
    const usesLimit = body.usesLimit;
    if (!Number.isSafeInteger(usesLimit) || Number(usesLimit) < 1 || Number(usesLimit) > 100) {
      throw new WorkspaceError(400, "usesLimit 1 ile 100 arasında bir tam sayı olmalı.");
    }
    return createInvite(userId, requiredUuid((await params).roomId), Number(usesLimit));
  }, true);
}

export async function GET(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => listRoomInvites(userId, requiredUuid((await params).roomId)));
}

export async function DELETE(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => {
    const body = await requestBody(request);
    if (typeof body.inviteId !== "string") throw new WorkspaceError(400, "inviteId gerekli.");
    return revokeInvite(userId, requiredUuid((await params).roomId), requiredUuid(body.inviteId));
  }, true);
}
