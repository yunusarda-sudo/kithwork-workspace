"use client";

import { authClient } from "@/features/auth/auth-client";
import AuthPanel from "@/features/auth/AuthPanel";
import Workspace from "@/features/workspace/Workspace";

export default function Home() {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-center text-muted">
        Loading...
      </main>
    );
  }

  if (!session.data) {
    return <AuthPanel />;
  }

  return <Workspace />;
}