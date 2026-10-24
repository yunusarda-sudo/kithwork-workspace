import { userRoute, requestBody, requiredText, requiredUuid } from "@/lib/api";
import { listKnowledge, proposeKnowledge } from "@/lib/workspace";

type Context = { params: Promise<{ roomId: string }> };
export async function GET(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => ({ items: await listKnowledge(userId, requiredUuid((await params).roomId)) }));
}
export async function POST(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => {
    const body = await requestBody(request);
    const itemId = body.itemId === undefined ? undefined : requiredUuid(typeof body.itemId === "string" ? body.itemId : "");
    return proposeKnowledge(userId, requiredUuid((await params).roomId), requiredText(body, "title", 200), requiredText(body, "content", 20000), itemId);
  }, true);
}
