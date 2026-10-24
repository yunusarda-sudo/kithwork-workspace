import { userRoute, requiredUuid } from "@/lib/api";
import { recentActivity } from "@/lib/workspace";

type Context = { params: Promise<{ roomId: string }> };
export async function GET(request: Request, { params }: Context) {
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  return userRoute(request, async (userId) => ({ events: await recentActivity(userId, requiredUuid((await params).roomId), cursor) }));
}
