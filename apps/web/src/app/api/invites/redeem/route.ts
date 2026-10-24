import { userRoute, requestBody, requiredText } from "@/lib/api";
import { redeemInvite } from "@/lib/workspace";

export async function POST(request: Request) {
  return userRoute(request, async (userId) => redeemInvite(userId, requiredText(await requestBody(request), "token", 160)), true);
}
