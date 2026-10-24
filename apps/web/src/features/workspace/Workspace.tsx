"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { authClient } from "@/features/auth/auth-client";
import AgentConnections from "@/features/auth/AgentConnections";
import * as api from "./api";
import type { ActivityEvent, KnowledgeItem, Room, RoomInvite, Task, TaskStatus } from "./types";

type LoadState = "idle" | "loading" | "error";

function activityLabel(type: string): string {
  const labels: Record<string, string> = {
    "room.created": "Room created",
    "room.invite_created": "Room invite created",
    "room.invite_revoked": "Room invite revoked",
    "room.invite_redeemed": "A member joined the room",
    "task.created": "Task created",
    "task.updated": "Task updated",
    "knowledge.proposed": "Knowledge proposed",
    "knowledge.approved": "Knowledge approved",
  };
  return labels[type] ?? type.replaceAll(".", " ");
}

export default function Workspace() {
  const session = authClient.useSession();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsState, setRoomsState] = useState<LoadState>("idle");
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksState, setTasksState] = useState<LoadState>("idle");
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [knowledgeState, setKnowledgeState] = useState<LoadState>("idle");
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [activityState, setActivityState] = useState<LoadState>("idle");
  const [activityRoomId, setActivityRoomId] = useState("");
  const [activityError, setActivityError] = useState<string | null>(null);
  const activityRequestId = useRef(0);

  const [newRoomName, setNewRoomName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ inviteId: string; token: string; usesLimit: number; expiresIn: string } | null>(null);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [inviteUsesLimit, setInviteUsesLimit] = useState(100);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [roomActionPending, setRoomActionPending] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [taskActionPending, setTaskActionPending] = useState(false);
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const [newKnowledgeTitle, setNewKnowledgeTitle] = useState("");
  const [newKnowledgeContent, setNewKnowledgeContent] = useState("");
  const [revisionItemId, setRevisionItemId] = useState<string | null>(null);
  const [revisionContent, setRevisionContent] = useState("");
  const [knowledgeActionPending, setKnowledgeActionPending] = useState(false);
  const [knowledgeActionError, setKnowledgeActionError] = useState<string | null>(null);
  const [approvingItemId, setApprovingItemId] = useState<string | null>(null);

  const [signOutPending, setSignOutPending] = useState(false);

  const loadRooms = useCallback(async () => {
    setRoomsState("loading");
    setRoomsError(null);
    try {
      const result = await api.listRooms();
      setRooms(result);
      setRoomsState("idle");
      if (result.length > 0 && !selectedRoomId) {
        setSelectedRoomId(result[0].id);
      }
      if (result.length === 0) {
        setSelectedRoomId("");
      }
    } catch (err) {
      setRoomsState("error");
      setRoomsError(err instanceof Error ? err.message : "Failed to load rooms.");
    }
  }, [selectedRoomId]);

  const loadTasks = useCallback(async (roomId: string) => {
    setTasksState("loading");
    setTasksError(null);
    try {
      const result = await api.listTasks(roomId);
      setTasks(result);
      setTasksState("idle");
    } catch (err) {
      setTasksState("error");
      setTasksError(err instanceof Error ? err.message : "Failed to load tasks.");
    }
  }, []);

  const loadKnowledge = useCallback(async (roomId: string) => {
    setKnowledgeState("loading");
    setKnowledgeError(null);
    try {
      const result = await api.listKnowledge(roomId);
      setKnowledge(result);
      setKnowledgeState("idle");
    } catch (err) {
      setKnowledgeState("error");
      setKnowledgeError(err instanceof Error ? err.message : "Failed to load knowledge.");
    }
  }, []);

  const loadActivity = useCallback(async (roomId: string) => {
    const requestId = ++activityRequestId.current;
    setActivityRoomId(roomId);
    setActivityState("loading");
    setActivityError(null);
    try {
      const result = await api.listActivity(roomId);
      if (requestId !== activityRequestId.current) return;
      setActivity(result);
      setActivityState("idle");
    } catch (err) {
      if (requestId !== activityRequestId.current) return;
      setActivityState("error");
      setActivityError(err instanceof Error ? err.message : "Failed to load room activity.");
    }
  }, []);

  const loadRoomInvites = useCallback(async (roomId: string) => {
    setInviteError(null);
    try {
      const result = await api.listInvites(roomId);
      setRoomInvites(result);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to load room invites.");
    }
  }, []);

  useEffect(() => {
    if (!session.data) return;
    const timer = window.setTimeout(() => void loadRooms(), 0);
    return () => window.clearTimeout(timer);
  }, [session.data, loadRooms]);

  useEffect(() => {
    if (!selectedRoomId) return;
    const timer = window.setTimeout(() => {
      void loadTasks(selectedRoomId);
      void loadKnowledge(selectedRoomId);
      void loadActivity(selectedRoomId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedRoomId, loadTasks, loadKnowledge, loadActivity]);

  useEffect(() => {
    if (!selectedRoomId) return;
    const interval = window.setInterval(() => void loadActivity(selectedRoomId), 15_000);
    return () => window.clearInterval(interval);
  }, [selectedRoomId, loadActivity]);

  useEffect(() => {
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
    if (!selectedRoomId || selectedRoom?.role !== "owner") return;
    const timer = window.setTimeout(() => void loadRoomInvites(selectedRoomId), 0);
    return () => window.clearTimeout(timer);
  }, [selectedRoomId, rooms, loadRoomInvites]);

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    setRoomActionPending(true);
    setRoomActionError(null);
    try {
      const room = await api.createRoom(name);
      setNewRoomName("");
      setCreatedInvite(null);
      await loadRooms();
      if (room) setSelectedRoomId(room.id);
    } catch (err) {
      setRoomActionError(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setRoomActionPending(false);
    }
  }

  async function handleCreateInvite() {
    if (!selectedRoomId) return;
    setInviteBusy(true);
    setInviteError(null);
    setCreatedInvite(null);
    try {
      const invite = await api.createInvite(selectedRoomId, inviteUsesLimit);
      setCreatedInvite(invite);
      await loadRoomInvites(selectedRoomId);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to create invite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!selectedRoomId || !window.confirm("Revoke this shared invitation? Anyone who has not joined yet will no longer be able to use it.")) return;
    setRevokingInviteId(inviteId);
    setInviteError(null);
    try {
      await api.revokeInvite(selectedRoomId, inviteId);
      setRoomInvites((current) => current.filter((invite) => invite.id !== inviteId));
      if (createdInvite?.inviteId === inviteId) setCreatedInvite(null);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to revoke invite.");
    } finally {
      setRevokingInviteId(null);
    }
  }

  async function handleRedeemInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteToken.trim()) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      const roomId = await api.redeemInvite(inviteToken.trim());
      setInviteToken("");
      setCreatedInvite(null);
      await loadRooms();
      setSelectedRoomId(roomId);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to join room.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoomId) return;
    const title = newTaskTitle.trim();
    if (!title) return;
    setTaskActionPending(true);
    setTaskActionError(null);
    try {
      await api.createTask(selectedRoomId, title);
      setNewTaskTitle("");
      await Promise.all([loadTasks(selectedRoomId), loadActivity(selectedRoomId)]);
    } catch (err) {
      setTaskActionError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setTaskActionPending(false);
    }
  }

  async function handleTaskStatus(task: Task, next: TaskStatus) {
    if (next === task.status) return;
    setUpdatingTaskId(task.id);
    setTaskActionError(null);
    try {
      await api.updateTask(task.id, next, task.version);
      await Promise.all([loadTasks(selectedRoomId), loadActivity(selectedRoomId)]);
    } catch (err) {
      setTaskActionError(err instanceof Error ? err.message : "Failed to update task.");
      await loadTasks(selectedRoomId);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleProposeKnowledge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoomId) return;
    const title = newKnowledgeTitle.trim();
    const content = newKnowledgeContent.trim();
    if (!title || !content) return;
    setKnowledgeActionPending(true);
    setKnowledgeActionError(null);
    try {
      await api.proposeKnowledge(selectedRoomId, title, content);
      setNewKnowledgeTitle("");
      setNewKnowledgeContent("");
      await Promise.all([loadKnowledge(selectedRoomId), loadActivity(selectedRoomId)]);
    } catch (err) {
      setKnowledgeActionError(err instanceof Error ? err.message : "Failed to propose knowledge.");
    } finally {
      setKnowledgeActionPending(false);
    }
  }

  async function handleProposeRevision(event: React.FormEvent<HTMLFormElement>, item: KnowledgeItem) {
    event.preventDefault();
    if (!selectedRoomId || !revisionContent.trim()) return;
    setKnowledgeActionPending(true);
    setKnowledgeActionError(null);
    try {
      await api.proposeKnowledge(selectedRoomId, item.title, revisionContent.trim(), item.id);
      setRevisionItemId(null);
      setRevisionContent("");
      await Promise.all([loadKnowledge(selectedRoomId), loadActivity(selectedRoomId)]);
    } catch (err) {
      setKnowledgeActionError(err instanceof Error ? err.message : "Failed to propose a new version.");
    } finally {
      setKnowledgeActionPending(false);
    }
  }

  async function handleApprove(item: KnowledgeItem) {
    setApprovingItemId(item.id);
    setKnowledgeActionError(null);
    try {
      await api.approveKnowledge(item.id, item.version);
      await Promise.all([loadKnowledge(selectedRoomId), loadActivity(selectedRoomId)]);
    } catch (err) {
      setKnowledgeActionError(err instanceof Error ? err.message : "Failed to approve knowledge.");
    } finally {
      setApprovingItemId(null);
    }
  }

  async function handleSignOut() {
    setSignOutPending(true);
    try {
      await authClient.signOut();
      await authClient.getSession();
    } finally {
      setSignOutPending(false);
    }
  }

  if (session.isPending) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-center text-muted">
        Loading session...
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const user = session.data.user;
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Collaboration workspace</h1>
            <p className="text-sm text-muted">
              Signed in as {user.name || user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOutPending}
            className="rounded-lg border border-border bg-surface-muted px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {signOutPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AgentConnections />
        <section aria-labelledby="rooms-heading" className="mb-6 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <h2 id="rooms-heading" className="text-lg font-semibold">
                Rooms
              </h2>
              <p className="mt-1 text-sm text-muted">
                Switch between rooms or create a new one.
              </p>
            </div>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleCreateRoom}>
              <label className="sr-only" htmlFor="new-room-name">
                New room name
              </label>
              <input
                id="new-room-name"
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                placeholder="New room name"
                maxLength={120}
                disabled={roomActionPending}
              />
              <button
                type="submit"
                disabled={roomActionPending || !newRoomName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {roomActionPending ? "Creating..." : "Create room"}
              </button>
            </form>
          </div>

          {roomActionError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {roomActionError}
            </p>
          ) : null}

          <div className="mt-4">
            {roomsState === "loading" ? (
              <p className="text-sm text-muted">Loading rooms...</p>
            ) : roomsState === "error" ? (
              <div className="flex items-center gap-3">
                <p role="alert" className="text-sm text-danger">
                  {roomsError}
                </p>
                <button
                  type="button"
                  onClick={() => void loadRooms()}
                  className="rounded-lg border border-border px-3 py-1 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-muted">No rooms yet. Create one to get started.</p>
            ) : (
              <label className="block text-sm font-medium">
                Current room
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground sm:max-w-md"
                  value={selectedRoomId}
                  onChange={(event) => {
                    setSelectedRoomId(event.target.value);
                    setCreatedInvite(null);
                    setInviteError(null);
                  }}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.role})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {selectedRoom ? (
            <p className="mt-3 text-xs text-muted">
              Room id: <span className="font-mono">{selectedRoom.id}</span>
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
              {selectedRoom?.role === "owner" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted" htmlFor="invite-uses-limit">
                      People who can join with this shared invite
                      <select id="invite-uses-limit" value={inviteUsesLimit} onChange={(event) => setInviteUsesLimit(Number(event.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" disabled={inviteBusy}>
                        {[1, 5, 10, 25, 50, 100].map((limit) => <option key={limit} value={limit}>{limit === 1 ? "1 person (single-use)" : `${limit} people`}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => void handleCreateInvite()} disabled={inviteBusy} className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm font-medium disabled:opacity-60">
                      {inviteBusy ? "Creating invite..." : "Create shared room invite"}
                    </button>
                  </div>
                  <p className="text-xs text-muted">One token can be used by the selected number of people to join this same room. It expires in 7 days. Share privately; each person signs in with their own account. Revoke it any time below.</p>
                  {createdInvite ? <p className="break-all rounded-lg bg-surface-muted p-3 font-mono text-xs" role="status">Shared invite token (up to {createdInvite.usesLimit} people, expires in {createdInvite.expiresIn}). Copy it now and share privately; it is not shown again: {createdInvite.token}</p> : null}
                  {roomInvites.length > 0 ? (
                    <ul className="space-y-2" aria-label="Active shared room invites">
                      {roomInvites.map((invite) => (
                        <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs">
                          <span>{invite.uses}/{invite.usesLimit} joined · expires {new Date(invite.expiresAt).toLocaleString()}</span>
                          <button type="button" onClick={() => void handleRevokeInvite(invite.id)} disabled={revokingInviteId === invite.id} className="rounded-md border border-border px-2 py-1 font-medium disabled:opacity-60">
                            {revokingInviteId === invite.id ? "Revoking..." : "Revoke invite"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleRedeemInvite}>
                <label className="sr-only" htmlFor="room-invite-token">Room invite token</label>
                <input id="room-invite-token" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground" value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} placeholder="Paste a room invite token" maxLength={160} disabled={inviteBusy} />
                <button type="submit" disabled={inviteBusy || !inviteToken.trim()} className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-60">Join room</button>
              </form>
              {inviteError ? <p role="alert" className="text-sm text-danger md:col-span-2">{inviteError}</p> : null}
          </div>
        </section>

        {selectedRoomId ? (
          <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-labelledby="tasks-heading" className="rounded-xl border border-border bg-surface p-5">
              <h2 id="tasks-heading" className="text-lg font-semibold">
                Tasks
              </h2>
              <p className="mt-1 text-sm text-muted">
                Create tasks and update their status.
              </p>

              <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleCreateTask}>
                <label className="sr-only" htmlFor="new-task-title">
                  New task title
                </label>
                <input
                  id="new-task-title"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="New task title"
                  maxLength={240}
                  disabled={taskActionPending}
                />
                <button
                  type="submit"
                  disabled={taskActionPending || !newTaskTitle.trim()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {taskActionPending ? "Adding..." : "Add task"}
                </button>
              </form>

              {taskActionError ? (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {taskActionError}
                </p>
              ) : null}

              <div className="mt-4">
                {tasksState === "loading" ? (
                  <p className="text-sm text-muted">Loading tasks...</p>
                ) : tasksState === "error" ? (
                  <div className="flex items-center gap-3">
                    <p role="alert" className="text-sm text-danger">
                      {tasksError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadTasks(selectedRoomId)}
                      className="rounded-lg border border-border px-3 py-1 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : tasks.length === 0 ? (
                  <p className="text-sm text-muted">No tasks in this room.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted">
                            {task.assigneeName ? `Assignee: ${task.assigneeName} · ` : ""}
                            Version {task.version}
                          </p>
                        </div>
                        <label className="sr-only" htmlFor={`task-status-${task.id}`}>
                          Status for {task.title}
                        </label>
                        <select
                          id={`task-status-${task.id}`}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          value={task.status}
                          disabled={updatingTaskId === task.id}
                          onChange={(event) =>
                            void handleTaskStatus(task, event.target.value as TaskStatus)
                          }
                        >
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section aria-labelledby="knowledge-heading" className="rounded-xl border border-border bg-surface p-5">
              <h2 id="knowledge-heading" className="text-lg font-semibold">
                Knowledge
              </h2>
              <p className="mt-1 text-sm text-muted">
                Propose immutable knowledge versions and approve a specific version.
              </p>

              <form className="mt-4 space-y-3" onSubmit={handleProposeKnowledge}>
                <label className="block text-sm font-medium">
                  Title
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    value={newKnowledgeTitle}
                    onChange={(event) => setNewKnowledgeTitle(event.target.value)}
                    maxLength={200}
                    disabled={knowledgeActionPending}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Content
                  <textarea
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    value={newKnowledgeContent}
                    onChange={(event) => setNewKnowledgeContent(event.target.value)}
                    rows={4}
                    maxLength={20000}
                    disabled={knowledgeActionPending}
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    knowledgeActionPending ||
                    !newKnowledgeTitle.trim() ||
                    !newKnowledgeContent.trim()
                  }
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {knowledgeActionPending ? "Proposing..." : "Propose knowledge"}
                </button>
              </form>

              {knowledgeActionError ? (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {knowledgeActionError}
                </p>
              ) : null}

              <div className="mt-4">
                {knowledgeState === "loading" ? (
                  <p className="text-sm text-muted">Loading knowledge...</p>
                ) : knowledgeState === "error" ? (
                  <div className="flex items-center gap-3">
                    <p role="alert" className="text-sm text-danger">
                      {knowledgeError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadKnowledge(selectedRoomId)}
                      className="rounded-lg border border-border px-3 py-1 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : knowledge.length === 0 ? (
                  <p className="text-sm text-muted">No knowledge items in this room.</p>
                ) : (
                  <ul className="space-y-4">
                    {knowledge.map((item) => (
                      <li key={`${item.id}-${item.version}`} className="rounded-lg border border-border p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                          <span className="inline-flex w-fit rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                          {item.content}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                          <div>
                            <dt className="font-medium">Version</dt>
                            <dd>{item.version}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Proposed by</dt>
                            <dd>{item.proposedBy || "Unknown"}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="font-medium">Item id</dt>
                            <dd className="font-mono">{item.id}</dd>
                          </div>
                        </dl>
                        {selectedRoom?.role === "owner" && item.status !== "approved" ? (
                          <button
                            type="button"
                            disabled={approvingItemId === item.id}
                            onClick={() => void handleApprove(item)}
                            className="mt-3 rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                          >
                            {approvingItemId === item.id
                              ? "Approving..."
                              : "Approve this version"}
                          </button>
                        ) : null}
                        {knowledge.every((candidate) => candidate.id !== item.id || candidate.version <= item.version) ? (
                          <form className="mt-3 space-y-2" onSubmit={(event) => void handleProposeRevision(event, item)}>
                            {revisionItemId === item.id ? (
                              <>
                                <label className="block text-xs font-medium">
                                  Propose a new version of this knowledge item
                                  <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" value={revisionContent} onChange={(event) => setRevisionContent(event.target.value)} rows={4} maxLength={20000} disabled={knowledgeActionPending} />
                                </label>
                                <div className="flex gap-2">
                                  <button type="submit" disabled={knowledgeActionPending || !revisionContent.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">{knowledgeActionPending ? "Submitting..." : "Submit version"}</button>
                                  <button type="button" onClick={() => { setRevisionItemId(null); setRevisionContent(""); }} className="rounded-lg border border-border px-3 py-1.5 text-sm">Cancel</button>
                                </div>
                              </>
                            ) : (
                              <button type="button" onClick={() => { setRevisionItemId(item.id); setRevisionContent(item.content); }} className="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium">Propose new version</button>
                            )}
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
          <section aria-labelledby="activity-heading" className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="activity-heading" className="text-lg font-semibold">Room activity</h2>
                <p className="mt-1 text-sm text-muted">Recent room actions. This list refreshes automatically every 15 seconds.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadActivity(selectedRoomId)}
                disabled={activityRoomId === selectedRoomId && activityState === "loading"}
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm font-medium disabled:opacity-60"
              >
                {activityRoomId === selectedRoomId && activityState === "loading" ? "Refreshing..." : "Refresh activity"}
              </button>
            </div>
            <div className="mt-4" aria-live="polite">
              {activityRoomId !== selectedRoomId || activityState === "loading" ? (
                <p className="text-sm text-muted">Loading room activity...</p>
              ) : activityState === "error" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p role="alert" className="text-sm text-danger">{activityError}</p>
                  <button type="button" onClick={() => void loadActivity(selectedRoomId)} className="rounded-lg border border-border px-3 py-1.5 text-sm">
                    Retry
                  </button>
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted">No activity recorded in this room yet.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {activity.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">{activityLabel(item.type)}</span>
                      <time className="text-xs text-muted" dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
          </div>
        ) : (
          <p className="text-sm text-muted">Select or create a room to view tasks and knowledge.</p>
        )}
      </main>
    </div>
  );
}
