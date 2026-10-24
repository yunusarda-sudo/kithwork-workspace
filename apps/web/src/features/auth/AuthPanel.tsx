"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
    <main className="auth-page">
      <div className="auth-card">
        <section className="auth-intro" aria-label="About Kithwork">
          <Link className="brand-lockup" href="/" aria-label="Kithwork home">
            <Image src="/icon.svg" alt="" width={38} height={38} />
            <span className="brand-name">Kithwork</span>
          </Link>
          <div className="auth-intro-copy">
            <p className="eyebrow">A shared workspace for your team</p>
            <h1>Shared work, with people in control.</h1>
            <p>
              Bring your team&apos;s tasks, reviewed knowledge, and AI clients into one room. Everyone connects with their own account; people stay in charge of what becomes shared knowledge.
            </p>
          </div>
          <ul className="auth-benefits">
            <li><span className="auth-benefit-mark" aria-hidden="true">01</span><span>People approve shared knowledge</span></li>
            <li><span className="auth-benefit-mark" aria-hidden="true">02</span><span>Rooms keep access scoped</span></li>
            <li><span className="auth-benefit-mark" aria-hidden="true">03</span><span>Connect the AI clients you choose</span></li>
          </ul>
        </section>

        <section className="auth-form-panel" aria-labelledby="auth-heading">
          <p className="eyebrow">Workspace access</p>
          <h2 id="auth-heading" className="mt-2">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p>
            {mode === "signin"
              ? "Sign in to open your rooms. Need to join a team? Use the invite token from the room owner after signing in."
              : "Create an account, then set up a room or join one with an invite from its owner."}
          </p>

          <div className="auth-mode-switch" role="group" aria-label="Account action">
            <button type="button" className="auth-mode-button" onClick={() => setMode("signin")} aria-pressed={mode === "signin"}>Sign in</button>
            <button type="button" className="auth-mode-button" onClick={() => setMode("signup")} aria-pressed={mode === "signup"}>Create account</button>
          </div>

          <form className="auth-form space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label>
                Your name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </label>
            ) : null}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                maxLength={128}
              />
            </label>

            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

            <button type="submit" disabled={pending} className="auth-form-submit">
              {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
