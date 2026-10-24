"use client";

import Image from "next/image";
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
    <main className="consent-page">
      <section className="consent-card" aria-labelledby="consent-heading">
        <div className="brand-lockup">
          <Image src="/icon.svg" alt="" width={36} height={36} />
          <span><span className="brand-name">Kithwork</span><span className="brand-caption">Secure agent connection</span></span>
        </div>

        <div className="consent-copy mt-8">
          <p className="eyebrow">Review access</p>
          <h1 id="consent-heading" className="mt-2">Authorize this MCP client?</h1>
          <p className="mt-2 text-sm text-muted">You&apos;re connecting an AI client to your Kithwork account. Review the client and permissions before continuing.</p>
        </div>

        <dl className="consent-client mt-6">
          <dt>Client</dt>
          <dd className="break-all font-mono">{clientId}</dd>
        </dl>

        <div className="mt-6">
          <h2 className="text-sm font-semibold">This client is requesting</h2>
          {scopes.length > 0 ? (
            <ul className="consent-scopes mt-3">
              {scopes.map((scope) => <li key={scope}><code>{scope}</code></li>)}
            </ul>
          ) : (
            <p className="empty-state mt-3">No access scopes were requested.</p>
          )}
        </div>

        <p className="agent-note mt-6">Room membership and owner approval are checked again for every tool call. You can revoke this client&apos;s consent later from your workspace.</p>
        {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="consent-actions mt-6">
          <button type="button" onClick={() => void respond(true)} disabled={pending} className="consent-authorize">
            {pending ? "Working…" : "Authorize client"}
          </button>
          <button type="button" onClick={() => void respond(false)} disabled={pending} className="consent-deny">
            Deny
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted">Only authorize clients you recognize and trust.</p>
      </section>
    </main>
  );
}
