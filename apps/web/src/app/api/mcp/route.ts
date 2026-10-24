import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { createInsufficientScopeError } from "better-auth/oauth2";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { oauthClient, oauthConsent } from "@/db/auth-schema";
import { and, eq } from "drizzle-orm";
import { approveKnowledge, createTask, listKnowledge, listRooms, listTasks, proposeKnowledge, recentActivity, updateTask } from "@/lib/workspace";

const resource = process.env.MCP_RESOURCE_URL ?? `${process.env.BETTER_AUTH_URL ?? "http://localhost:3200"}/api/mcp`;
const expectedOrigin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3200").origin;
const resourceMetadata = `${expectedOrigin}/.well-known/oauth-protected-resource${new URL(resource).pathname}`;

function mcpAuthRequired() {
  return new Response(JSON.stringify({ error: "MCP authorization is no longer active." }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadata}"`,
    },
  });
}

function hasScope(claims: Record<string, unknown>, scope: string) {
  const raw = claims.scope;
  const scopes = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(" ") : [];
  if (!scopes.includes(scope)) throw createInsufficientScopeError([scope]);
}

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function createServer(userId: string, scopes: Record<string, unknown>) {
  const server = new McpServer({ name: "Kithwork", version: "0.1.0" });
  server.registerTool("list_rooms", { description: "List rooms the authenticated human belongs to.", inputSchema: z.object({}) }, async () => {
    hasScope(scopes, "mcp:read");
    const rooms = await listRooms(userId);
    return textResult(rooms);
  });
  server.registerTool("list_tasks", { description: "List tasks in a room the user belongs to.", inputSchema: { roomId: z.string().uuid() } }, async ({ roomId }) => {
    hasScope(scopes, "mcp:read");
    return textResult(await listTasks(userId, roomId));
  });
  server.registerTool("create_task", { description: "Create a task in a room where the user is a member.", inputSchema: { roomId: z.string().uuid(), title: z.string().min(1).max(240) } }, async ({ roomId, title }) => {
    hasScope(scopes, "mcp:write");
    return textResult(await createTask(userId, roomId, title));
  });
  server.registerTool("update_task", { description: "Update task status with optimistic version checking.", inputSchema: { taskId: z.string().uuid(), status: z.enum(["todo", "in_progress", "done"]), expectedVersion: z.number().int().positive() } }, async ({ taskId, status, expectedVersion }) => {
    hasScope(scopes, "mcp:write");
    return textResult(await updateTask(userId, taskId, status, expectedVersion));
  });
  server.registerTool("list_knowledge", { description: "List proposed and human-approved knowledge in a room.", inputSchema: { roomId: z.string().uuid() } }, async ({ roomId }) => {
    hasScope(scopes, "mcp:read");
    return textResult(await listKnowledge(userId, roomId));
  });
  server.registerTool("propose_knowledge", { description: "Create a knowledge item or append a new immutable version for human review; this tool cannot approve it.", inputSchema: { roomId: z.string().uuid(), title: z.string().min(1).max(200), content: z.string().min(1).max(20000), itemId: z.string().uuid().optional() } }, async ({ roomId, title, content, itemId }) => {
    hasScope(scopes, "mcp:write");
    return textResult(await proposeKnowledge(userId, roomId, title, content, itemId));
  });
  server.registerTool("approve_knowledge", { description: "Approve a specific version. Requires both knowledge:approve OAuth scope and current room owner membership.", inputSchema: { itemId: z.string().uuid(), expectedVersion: z.number().int().positive() } }, async ({ itemId, expectedVersion }) => {
    hasScope(scopes, "knowledge:approve");
    return textResult(await approveKnowledge(userId, itemId, expectedVersion));
  });
  server.registerTool("get_recent_activity", { description: "Without a cursor, return the newest 100 room events in chronological order. For precise pagination, pass the id of the last event in the previous batch. Legacy ISO timestamp cursors remain accepted.", inputSchema: { roomId: z.string().uuid(), cursor: z.string().optional() } }, async ({ roomId, cursor }) => {
    hasScope(scopes, "mcp:read");
    return textResult(await recentActivity(userId, roomId, cursor));
  });
  return server;
}

async function protectedMcp(request: Request, claims: Record<string, unknown>) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  if (url.origin !== expectedOrigin || host !== url.host || (origin && origin !== expectedOrigin)) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const userId = typeof claims.sub === "string" ? claims.sub : "";
  const clientId = typeof claims.client_id === "string" ? claims.client_id : "";
  if (!userId || !clientId) return mcpAuthRequired();
  const [client] = await db.select({ disabled: oauthClient.disabled }).from(oauthClient).where(eq(oauthClient.clientId, clientId)).limit(1);
  const [consent] = await db.select({ scopes: oauthConsent.scopes }).from(oauthConsent)
    .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId))).limit(1);
  const scopeClaim = claims.scope;
  const tokenScopes = Array.isArray(scopeClaim) ? scopeClaim : typeof scopeClaim === "string" ? scopeClaim.split(" ") : [];
  if (!client || client.disabled || !consent || tokenScopes.some((scope) => typeof scope !== "string" || !consent.scopes.includes(scope))) {
    return mcpAuthRequired();
  }
  const server = createServer(userId, claims);
  // SDK v2.4.0 implements MCP 2025-11-25 as stateless legacy HTTP. Keep that
  // transport available without enabling stateful SSE sessions.
  return createMcpHandler(() => server, { legacy: "stateless" }).fetch(request);
}

export const POST = requireMcpAuth(auth, protectedMcp, { resource, challengeScopes: ["mcp:read"] });
