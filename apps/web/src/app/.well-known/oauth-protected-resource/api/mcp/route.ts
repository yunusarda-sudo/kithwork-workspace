import { auth } from "@/lib/auth";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  return auth.handler(request);
}
export async function HEAD(request: Request) {
  await connection();
  return auth.handler(request);
}
