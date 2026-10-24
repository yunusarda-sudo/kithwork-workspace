import { Suspense } from "react";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { headers } from "next/headers";

import ConsentForm from "@/features/auth/ConsentForm";
import { auth } from "@/lib/auth";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function ConsentFallback() {
  return <main className="mx-auto max-w-xl p-8" aria-busy="true">Loading authorization details...</main>;
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
    return <main className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">Invalid or expired authorization request</h1></main>;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <main className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">Sign in to continue</h1><a className="mt-3 inline-block underline" href={`/sign-in?${query.toString()}`}>Sign in</a></main>;

  const clientId = query.get("client_id") ?? "Unknown client";
  const scopes = (query.get("scope") ?? "").split(" ").filter(Boolean);
  return <ConsentForm clientId={clientId} scopes={scopes} />;
}
