import { userRoute, requestBody, requiredText } from "@/lib/api";
import { createRoom, listRooms } from "@/lib/workspace";

export async function GET(request: Request) {
  return userRoute(request, async (userId) => ({ rooms: await listRooms(userId) }));
}

export async function POST(request: Request) {
  return userRoute(request, async (userId) => ({ room: await createRoom(userId, requiredText(await requestBody(request), "name", 120)) }), true);
}
