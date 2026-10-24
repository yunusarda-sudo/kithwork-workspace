"use client";

import { useState } from "react";
import { authClient } from "./auth-client";

export default function ConsentForm({ clientId, scopes }: { clientId: string; scopes: string[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await authClient.oauth2.consent({ accept, scope: scopes.join(" ") });
      if (response.error) setError(response.error.message ?? "Authorization could not be completed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authorization could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Authorize an agent client?</h1>
        <p className="mt-2 text-sm text-muted">OAuth client <code className="break-all">{clientId}</code> is requesting access to the collaboration MCP endpoint.</p>
        <h2 className="mt-5 text-sm font-semibold">Requested scopes</h2>
        <ul className="mt-2 list-inside list-disc text-sm">
          {scopes.map((scope) => <li key={scope}><code>{scope}</code></li>)}
        </ul>
        <p className="mt-4 text-sm text-muted">Room membership and owner approval rules are checked again on each tool call. Revoking this consent does not replace removing a user&apos;s room membership.</p>
        {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => void respond(true)} disabled={pending} className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-60">{pending ? "Working..." : "Authorize"}</button>
          <button type="button" onClick={() => void respond(false)} disabled={pending} className="rounded-lg border border-border px-4 py-2 font-medium disabled:opacity-60">Deny</button>
        </div>
      </section>
    </main>
  );
}
