"use client";

import { useEffect, useState } from "react";
import { authClient } from "./auth-client";

type Connection = { id: string; clientId?: string; scopes?: string[] };

export default function AgentConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const result = await authClient.oauth2.getConsents();
    if (result.error) {
      setError(result.error.message ?? "Could not load agent connections.");
      return;
    }
    const data = result.data;
    setConnections(Array.isArray(data) ? data as Connection[] : []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function disconnect(connection: Connection) {
    setBusy(connection.id);
    setError(null);
    try {
      const result = await authClient.oauth2.deleteConsent({ id: connection.id });
      if (result.error) {
        setError(result.error.message ?? "Could not disconnect agent client.");
        return;
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not disconnect agent client.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="agent-connections-heading" className="mb-6 rounded-xl border border-border bg-surface p-5">
      <h2 id="agent-connections-heading" className="text-lg font-semibold">Connected agent clients</h2>
      <p className="mt-1 text-sm text-muted">Disconnecting removes OAuth consent. Existing access tokens are rejected on their next MCP request.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
      {connections.length === 0 ? <p className="mt-3 text-sm text-muted">No connected clients.</p> : (
        <ul className="mt-3 divide-y divide-border">
          {connections.map((connection) => (
            <li key={connection.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="break-all font-mono text-xs">{connection.clientId ?? connection.id}</p><p className="mt-1 text-xs text-muted">Scopes: {(connection.scopes ?? []).join(", ") || "none"}</p></div>
              <button type="button" onClick={() => void disconnect(connection)} disabled={busy !== null} className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-60">
                {busy === connection.id ? "Disconnecting..." : "Disconnect"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
