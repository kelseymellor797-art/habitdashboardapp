"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecoveryLink =
      window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");

    if (isRecoveryLink) {
      setMode("reset");
      setMessage("Enter a new password to finish resetting your account.");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !isRecoveryLink) router.replace("/dashboard");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setPassword("");
        setMessage("Enter a new password to finish resetting your account.");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (mode === "reset") {
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Password updated. Sending you to your dashboard...");
      router.replace("/dashboard");
      return;
    }

    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (mode === "signup" && !data.session) {
      setMessage("Check your email to confirm the account, then sign in.");
      return;
    }

    router.replace("/dashboard");
  }

  async function sendPasswordReset() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("Enter your email first, then I can send the reset link.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/login`,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox, then open the reset link.");
  }

  return (
    <main className="min-h-screen bg-[#07100d] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-base font-bold text-[#07100d]">
            H
          </div>
          <h1 className="text-3xl font-semibold tracking-normal text-white">HabitFlow</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Sign in to your private habits and training dashboard.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="space-y-4">
            {mode !== "reset" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/55">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-300/50"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/55">
                {mode === "reset" ? "New password" : "Password"}
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                className="w-full rounded-lg border border-white/[0.1] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-300/50"
              />
            </label>
          </div>

          {message && (
            <p className="mt-4 rounded-lg border border-rose-300/15 bg-rose-300/[0.06] px-3 py-2 text-sm text-rose-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || (mode !== "reset" && !email.trim()) || password.length < 6}
            className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07100d] hover:bg-emerald-300 disabled:opacity-45"
          >
            {busy
              ? "Working..."
              : mode === "reset"
                ? "Update password"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={busy || !email.trim()}
              className="mt-3 w-full rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-white/65 hover:border-white/20 hover:text-white disabled:opacity-45"
            >
              Send password reset email
            </button>
          )}

          {allowSignup && mode !== "reset" && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setMessage("");
              }}
              className="mt-3 w-full rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-white/65 hover:border-white/20 hover:text-white"
            >
              {mode === "signup" ? "I already have an account" : "Create my account"}
            </button>
          )}
        </form>

        <p className="mt-4 text-xs leading-5 text-white/35">
          Account creation is disabled unless signup is explicitly enabled for setup.
        </p>
      </div>
    </main>
  );
}
