"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearLocalAppData } from "@/lib/supabaseSync";

export default function SignOutButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    setBusy(true);
    clearLocalAppData();
    await supabase.auth.signOut();
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-[11px] font-bold text-[#06110d] shadow-lg">
        K
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-white">Katrina</div>
        <div className="truncate text-[10px] text-white/35">{email ?? "Private dashboard"}</div>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-white/55 hover:border-rose-300/30 hover:text-rose-200 disabled:opacity-40"
      >
        {busy ? "..." : "Out"}
      </button>
    </div>
  );
}
