import { userRoute, requestBody, expectedVersion, requiredUuid } from "@/lib/api";
import { approveKnowledge } from "@/lib/workspace";

type Context = { params: Promise<{ itemId: string }> };
export async function POST(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => approveKnowledge(userId, requiredUuid((await params).itemId), expectedVersion(await requestBody(request))), true);
}
