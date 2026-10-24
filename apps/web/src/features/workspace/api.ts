import {
  parseKnowledge,
  parseActivity,
  parseRoom,
  parseRooms,
  parseTasks,
  type KnowledgeItem,
  type ActivityEvent,
  type Room,
  type RoomInvite,
  type Task,
  type TaskStatus,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export async function listRooms(): Promise<Room[]> {
  const data = await requestJson<unknown>("/api/rooms");
  return parseRooms(data);
}

export async function createRoom(name: string): Promise<Room | null> {
  const data = await requestJson<unknown>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return parseRoom(data);
}

export async function listTasks(roomId: string): Promise<Task[]> {
  const data = await requestJson<unknown>(`/api/rooms/${encodeURIComponent(roomId)}/tasks`);
  return parseTasks(data);
}

export async function createTask(roomId: string, title: string): Promise<void> {
  await requestJson<unknown>(`/api/rooms/${encodeURIComponent(roomId)}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateTask(taskId: string, status: TaskStatus, expectedVersion: number): Promise<void> {
  await requestJson<unknown>(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, expectedVersion }),
  });
}

export async function listKnowledge(roomId: string): Promise<KnowledgeItem[]> {
  const data = await requestJson<unknown>(`/api/rooms/${encodeURIComponent(roomId)}/knowledge`);
  return parseKnowledge(data);
}

export async function listActivity(roomId: string): Promise<ActivityEvent[]> {
  const data = await requestJson<unknown>(`/api/rooms/${encodeURIComponent(roomId)}/activity`);
  return parseActivity(data);
}

export async function proposeKnowledge(roomId: string, title: string, content: string, itemId?: string): Promise<void> {
  await requestJson<unknown>(`/api/rooms/${encodeURIComponent(roomId)}/knowledge`, {
    method: "POST",
    body: JSON.stringify({ title, content, ...(itemId ? { itemId } : {}) }),
  });
}

export async function approveKnowledge(itemId: string, expectedVersion: number): Promise<void> {
  await requestJson<unknown>(`/api/knowledge/${encodeURIComponent(itemId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ expectedVersion }),
  });
}

export async function listInvites(roomId: string): Promise<RoomInvite[]> {
  return requestJson(`/api/rooms/${encodeURIComponent(roomId)}/invites`);
}

export async function createInvite(roomId: string, usesLimit: number): Promise<{ inviteId: string; token: string; usesLimit: number; expiresIn: string }> {
  return requestJson(`/api/rooms/${encodeURIComponent(roomId)}/invites`, { method: "POST", body: JSON.stringify({ usesLimit }) });
}

export async function revokeInvite(roomId: string, inviteId: string): Promise<void> {
  await requestJson(`/api/rooms/${encodeURIComponent(roomId)}/invites`, { method: "DELETE", body: JSON.stringify({ inviteId }) });
}

export async function redeemInvite(token: string): Promise<string> {
  const data = await requestJson<{ roomId: string }>("/api/invites/redeem", { method: "POST", body: JSON.stringify({ token }) });
  return data.roomId;
}
