import { userRoute, requestBody, requiredText, expectedVersion, requiredUuid } from "@/lib/api";
import { updateTask } from "@/lib/workspace";
import { WorkspaceError } from "@/lib/workspace";

type Context = { params: Promise<{ taskId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  return userRoute(request, async (userId) => {
    const body = await requestBody(request);
    const status = requiredText(body, "status", 20);
    if (!(["todo", "in_progress", "done"] as string[]).includes(status)) throw new WorkspaceError(400, "Geçersiz görev durumu.");
    return updateTask(userId, requiredUuid((await params).taskId), status as "todo" | "in_progress" | "done", expectedVersion(body));
  }, true);
}
