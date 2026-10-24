import { userRoute, requestBody, requiredText, requiredUuid } from "@/lib/api";
import { createTask, listTasks } from "@/lib/workspace";

type Context = { params: Promise<{ roomId: string }> };
export async function GET(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => ({ tasks: await listTasks(userId, requiredUuid((await params).roomId)) }));
}
export async function POST(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => createTask(userId, requiredUuid((await params).roomId), requiredText(await requestBody(request), "title", 240)), true);
}
