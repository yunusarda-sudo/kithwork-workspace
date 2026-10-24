"use client";

import { useState } from "react";

import { authClient } from "./auth-client";

export default function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign up failed.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed.");
          return;
        }
      }
      await authClient.getSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Collaboration workspace</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in or create a local account to access rooms.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === "signin"
                ? "bg-accent text-white"
                : "bg-surface-muted text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === "signup"
                ? "bg-accent text-white"
                : "bg-surface-muted text-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label className="block text-sm font-medium">
              Name
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                maxLength={120}
              />
            </label>
          ) : null}

          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>

          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}