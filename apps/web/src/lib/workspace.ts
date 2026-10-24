import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { activityEvents, knowledgeApprovals, knowledgeItems, knowledgeVersions, roomInvites, roomMembers, rooms, tasks } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class WorkspaceError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

async function requireMembership(tx: Tx, userId: string, roomId: string, minimum: "member" | "owner" = "member") {
  const [membership] = await tx.select({ role: roomMembers.role }).from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId))).limit(1);
  if (!membership || (minimum === "owner" && membership.role !== "owner")) {
    throw new WorkspaceError(403, "Bu oda için yetkiniz yok.");
  }
  return membership.role;
}

async function event(tx: Tx, roomId: string, userId: string, type: string, subjectId: string, payload: Record<string, unknown> = {}) {
  await tx.insert(activityEvents).values({ roomId, actorId: userId, type, subjectId, payload });
}

export async function listRooms(userId: string) {
  return withUser(userId, async (tx) => tx.select({ id: rooms.id, name: rooms.name, role: roomMembers.role })
    .from(roomMembers).innerJoin(rooms, eq(rooms.id, roomMembers.roomId)).where(eq(roomMembers.userId, userId)).orderBy(asc(rooms.name)));
}

export async function createRoom(userId: string, name: string) {
  return withUser(userId, async (tx) => {
    const [room] = await tx.insert(rooms).values({ name, createdBy: userId }).returning();
    await tx.insert(roomMembers).values({ roomId: room.id, userId, role: "owner" });
    await event(tx, room.id, userId, "room.created", room.id, { name });
    return room;
  });
}

export async function listRoomInvites(userId: string, roomId: string) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId, "owner");
    return tx.select({ id: roomInvites.id, uses: roomInvites.uses, usesLimit: roomInvites.usesLimit, expiresAt: roomInvites.expiresAt, createdAt: roomInvites.createdAt })
      .from(roomInvites).where(and(eq(roomInvites.roomId, roomId), eq(roomInvites.revoked, false), gt(roomInvites.expiresAt, new Date()), sql`${roomInvites.uses} < ${roomInvites.usesLimit}`))
      .orderBy(desc(roomInvites.createdAt));
  });
}

export async function createInvite(userId: string, roomId: string, usesLimit = 100) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId, "owner");
    if (!Number.isInteger(usesLimit) || usesLimit < 1 || usesLimit > 100) {
      throw new WorkspaceError(400, "Davet kullanım sınırı 1 ile 100 arasında olmalı.");
    }
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [invite] = await tx.insert(roomInvites).values({ roomId, tokenHash, usesLimit, createdBy: userId, expiresAt: new Date(Date.now() + 7 * 86400000) }).returning({ id: roomInvites.id });
    await event(tx, roomId, userId, "room.invite_created", invite.id, { usesLimit });
    return { inviteId: invite.id, token, usesLimit, expiresIn: "7 days" };
  });
}

export async function revokeInvite(userId: string, roomId: string, inviteId: string) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId, "owner");
    const [invite] = await tx.update(roomInvites).set({ revoked: true })
      .where(and(eq(roomInvites.id, inviteId), eq(roomInvites.roomId, roomId), eq(roomInvites.revoked, false)))
      .returning({ id: roomInvites.id });
    if (!invite) throw new WorkspaceError(404, "Etkin davet bulunamadı.");
    await event(tx, roomId, userId, "room.invite_revoked", invite.id);
    return { revoked: true };
  });
}

export async function redeemInvite(userId: string, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    const result = await tx.execute(sql`select redeem_room_invite(${tokenHash}, ${userId}) as room_id`);
    const roomId = (result as unknown as { rows: Array<{ room_id: string }> }).rows[0]?.room_id;
    if (!roomId) throw new WorkspaceError(404, "Davet geçersiz veya süresi dolmuş.");
    await event(tx, roomId, userId, "room.invite_redeemed", roomId);
    return { roomId };
  });
}

export async function listTasks(userId: string, roomId: string) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId);
    return tx.select({ id: tasks.id, title: tasks.title, status: tasks.status, version: tasks.version, assigneeId: tasks.assigneeId })
      .from(tasks).where(eq(tasks.roomId, roomId)).orderBy(desc(tasks.updatedAt));
  });
}

export async function createTask(userId: string, roomId: string, title: string) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId);
    const [task] = await tx.insert(tasks).values({ roomId, title, createdBy: userId }).returning();
    await event(tx, roomId, userId, "task.created", task.id, { title });
    return task;
  });
}

export async function updateTask(userId: string, taskId: string, status: "todo" | "in_progress" | "done", expectedVersion: number) {
  return withUser(userId, async (tx) => {
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1).for("update");
    if (!task) throw new WorkspaceError(404, "Görev bulunamadı.");
    await requireMembership(tx, userId, task.roomId);
    if (task.version !== expectedVersion) throw new WorkspaceError(409, "Görev daha önce değiştirildi. Yenileyip tekrar deneyin.");
    const [updated] = await tx.update(tasks).set({ status, version: task.version + 1, updatedAt: new Date() }).where(eq(tasks.id, taskId)).returning();
    await event(tx, task.roomId, userId, "task.updated", task.id, { status, version: updated.version });
    return updated;
  });
}

export async function listKnowledge(userId: string, roomId: string) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId);
    const rows = await tx.select({ id: knowledgeItems.id, title: knowledgeItems.title, content: knowledgeVersions.content, version: knowledgeVersions.version, proposedBy: knowledgeVersions.proposedBy, approvalId: knowledgeApprovals.id, createdAt: knowledgeVersions.createdAt })
      .from(knowledgeItems).innerJoin(knowledgeVersions, eq(knowledgeVersions.itemId, knowledgeItems.id)).leftJoin(knowledgeApprovals, and(eq(knowledgeApprovals.itemId, knowledgeVersions.itemId), eq(knowledgeApprovals.version, knowledgeVersions.version)))
      .where(eq(knowledgeItems.roomId, roomId)).orderBy(desc(knowledgeVersions.createdAt));
    return rows.map(({ approvalId, ...row }) => ({ ...row, status: approvalId ? "approved" : "proposed" }));
  });
}

export async function proposeKnowledge(userId: string, roomId: string, title: string, content: string, itemId?: string) {
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId);
    let item: typeof knowledgeItems.$inferSelect;
    let versionNumber = 1;
    if (itemId) {
      // Serialize version allocation without requiring UPDATE privileges on immutable knowledge items.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${itemId}, 0))`);
      const [existing] = await tx.select().from(knowledgeItems).where(and(eq(knowledgeItems.id, itemId), eq(knowledgeItems.roomId, roomId))).limit(1);
      if (!existing) throw new WorkspaceError(404, "Bilgi kaydı bulunamadı.");
      item = existing;
      const [latest] = await tx.select({ version: knowledgeVersions.version }).from(knowledgeVersions).where(eq(knowledgeVersions.itemId, itemId)).orderBy(desc(knowledgeVersions.version)).limit(1);
      versionNumber = (latest?.version ?? 0) + 1;
    } else {
      [item] = await tx.insert(knowledgeItems).values({ roomId, title, createdBy: userId }).returning();
    }
    const [version] = await tx.insert(knowledgeVersions).values({ itemId: item.id, version: versionNumber, content, proposedBy: userId }).returning();
    await event(tx, roomId, userId, "knowledge.proposed", item.id, { version: versionNumber });
    return { id: item.id, versionId: version.id, roomId: item.roomId, title: item.title, content: version.content, version: version.version, proposedBy: version.proposedBy, status: "proposed" };
  });
}

export async function approveKnowledge(userId: string, itemId: string, expectedVersion: number) {
  return withUser(userId, async (tx) => {
    const [item] = await tx.select().from(knowledgeItems).where(eq(knowledgeItems.id, itemId)).limit(1);
    if (!item) throw new WorkspaceError(404, "Bilgi kaydı bulunamadı.");
    await requireMembership(tx, userId, item.roomId, "owner");
    const [version] = await tx.select().from(knowledgeVersions).where(and(eq(knowledgeVersions.itemId, itemId), eq(knowledgeVersions.version, expectedVersion))).limit(1);
    if (!version) throw new WorkspaceError(404, "Önerilen sürüm bulunamadı.");
    const [existing] = await tx.select().from(knowledgeApprovals).where(and(eq(knowledgeApprovals.itemId, itemId), eq(knowledgeApprovals.version, expectedVersion))).limit(1);
    if (existing) throw new WorkspaceError(409, "Bu sürüm zaten onaylanmış.");
    await tx.insert(knowledgeApprovals).values({ itemId, version: expectedVersion, approvedBy: userId });
    await event(tx, item.roomId, userId, "knowledge.approved", itemId, { version: expectedVersion });
    return { id: itemId, version: expectedVersion, status: "approved" };
  });
}

type ActivityCursor = { type: "event"; id: string } | { type: "timestamp"; date: Date };

export function parseActivityCursor(cursor?: string): ActivityCursor | undefined {
  if (cursor === undefined) return undefined;
  const normalizedCursor = cursor.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedCursor)) {
    return { type: "event", id: normalizedCursor };
  }
  const date = new Date(normalizedCursor);
  if (!normalizedCursor || !Number.isFinite(date.getTime())) {
    throw new WorkspaceError(400, "Etkinlik imleci geçerli bir tarih olmalı.");
  }
  return { type: "timestamp", date };
}

export async function recentActivity(userId: string, roomId: string, cursor?: string) {
  const parsedCursor = parseActivityCursor(cursor);
  return withUser(userId, async (tx) => {
    await requireMembership(tx, userId, roomId);
    if (parsedCursor?.type === "event") {
      const [anchor] = await tx.select({
        exactCreatedAt: sql<string>`to_char(${activityEvents.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      }).from(activityEvents)
        .where(and(eq(activityEvents.roomId, roomId), eq(activityEvents.id, parsedCursor.id)))
        .limit(1);
      if (!anchor) throw new WorkspaceError(400, "Etkinlik imleci bu oda içinde bulunamadı.");
      const anchorTimestamp = sql`${anchor.exactCreatedAt}::timestamptz`;
      return tx.select().from(activityEvents)
        .where(and(
          eq(activityEvents.roomId, roomId),
          or(
            gt(activityEvents.createdAt, anchorTimestamp),
            and(eq(activityEvents.createdAt, anchorTimestamp), gt(activityEvents.id, parsedCursor.id)),
          ),
        ))
        .orderBy(asc(activityEvents.createdAt), asc(activityEvents.id))
        .limit(100);
    }
    if (parsedCursor?.type === "timestamp") {
      return tx.select().from(activityEvents)
        .where(and(eq(activityEvents.roomId, roomId), gt(activityEvents.createdAt, parsedCursor.date)))
        .orderBy(asc(activityEvents.createdAt), asc(activityEvents.id))
        .limit(100);
    }
    const newestFirst = await tx.select().from(activityEvents)
      .where(eq(activityEvents.roomId, roomId))
      .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
      .limit(100);
    return newestFirst.reverse();
  });
}
