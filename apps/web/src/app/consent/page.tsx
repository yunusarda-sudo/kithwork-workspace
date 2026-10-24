import { Suspense } from "react";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { headers } from "next/headers";
import Link from "next/link";

import ConsentForm from "@/features/auth/ConsentForm";
import { auth } from "@/lib/auth";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function ConsentFallback() {
  return <main className="consent-page"><section className="consent-card" aria-busy="true"><p className="eyebrow">Kithwork</p><h1 className="mt-3 text-xl font-semibold">Loading authorization details…</h1><p className="mt-2 text-sm text-muted">Checking the requested client and permissions.</p></section></main>;
}

export default function ConsentPage(props: Props) {
  return <Suspense fallback={<ConsentFallback />}><ConsentContent searchParams={props.searchParams} /></Suspense>;
}

async function ConsentContent({ searchParams }: Props) {
  const incoming = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") query.set(key, value);
    else value?.forEach((entry) => query.append(key, entry));
  }
  const { secret } = await auth.$context;
  if (!(await verifyOAuthQueryParams(query.toString(), secret))) {
    return <main className="consent-page"><section className="consent-card"><p className="eyebrow">Kithwork security</p><h1 className="mt-3 text-xl font-semibold">This authorization link is invalid or expired.</h1><p className="mt-2 text-sm text-muted">Return to your MCP client and start the connection again to get a fresh request.</p></section></main>;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <main className="consent-page"><section className="consent-card"><p className="eyebrow">Kithwork</p><h1 className="mt-3 text-xl font-semibold">Sign in to continue.</h1><p className="mt-2 text-sm text-muted">After signing in, you&apos;ll return here to review the MCP client&apos;s request.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" href={`/sign-in?${query.toString()}`}>Continue to sign in</Link></section></main>;

  const clientId = query.get("client_id") ?? "Unknown client";
  const scopes = (query.get("scope") ?? "").split(" ").filter(Boolean);
  return <ConsentForm clientId={clientId} scopes={scopes} />;
}
