export type TaskStatus = "todo" | "in_progress" | "done";

export type Room = {
  id: string;
  name: string;
  role: string;
};

export type RoomInvite = {
  id: string;
  uses: number;
  usesLimit: number;
  expiresAt: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  version: number;
  assigneeName: string;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  status: string;
  version: number;
  proposedBy: string;
};

export type ActivityEvent = {
  id: string;
  type: string;
  createdAt: string;
};

export type ApiError = { error?: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseRooms(value: unknown): Room[] {
  if (!value || typeof value !== "object") return [];
  const rooms = (value as { rooms?: unknown }).rooms;
  if (!Array.isArray(rooms)) return [];
  return rooms
    .map((room) => {
      if (!room || typeof room !== "object") return null;
      const r = room as Record<string, unknown>;
      const id = asString(r.id);
      if (!id) return null;
      return {
        id,
        name: asString(r.name) || id,
        role: asString(r.role) || "member",
      };
    })
    .filter((room): room is Room => room !== null);
}

export function parseRoom(value: unknown): Room | null {
  if (!value || typeof value !== "object") return null;
  const room = (value as { room?: unknown }).room;
  if (!room || typeof room !== "object") return null;
  const r = room as Record<string, unknown>;
  const id = asString(r.id);
  if (!id) return null;
  return {
    id,
    name: asString(r.name) || id,
    role: asString(r.role) || "member",
  };
}

export function parseTasks(value: unknown): Task[] {
  if (!value || typeof value !== "object") return [];
  const tasks = (value as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task) => {
      if (!task || typeof task !== "object") return null;
      const t = task as Record<string, unknown>;
      const id = asString(t.id);
      if (!id) return null;
      const statusRaw = asString(t.status);
      const status: TaskStatus =
        statusRaw === "in_progress" || statusRaw === "done" ? statusRaw : "todo";
      return {
        id,
        title: asString(t.title) || id,
        status,
        version: Math.max(1, Math.trunc(asNumber(t.version)) || 1),
        assigneeName: asString(t.assigneeName),
      };
    })
    .filter((task): task is Task => task !== null);
}

export function parseKnowledge(value: unknown): KnowledgeItem[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const k = item as Record<string, unknown>;
      const id = asString(k.id);
      if (!id) return null;
      return {
        id,
        title: asString(k.title) || id,
        content: asString(k.content),
        status: asString(k.status) || "proposed",
        version: Math.max(1, Math.trunc(asNumber(k.version)) || 1),
        proposedBy: asString(k.proposedBy),
      };
    })
    .filter((item): item is KnowledgeItem => item !== null);
}

export function parseActivity(value: unknown): ActivityEvent[] {
  if (!value || typeof value !== "object") return [];
  const events = (value as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => {
      if (!event || typeof event !== "object") return null;
      const record = event as Record<string, unknown>;
      const id = asString(record.id);
      const type = asString(record.type);
      const createdAt = asString(record.createdAt);
      if (!id || !type || !Number.isFinite(Date.parse(createdAt))) return null;
      return { id, type, createdAt };
    })
    .filter((event): event is ActivityEvent => event !== null);
}

export function formatTaskStatus(status: TaskStatus): string {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  return "To do";
}
