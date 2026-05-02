"use client";

import { type Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearLocalAppData, resetSupabaseSyncState } from "@/lib/supabaseSync";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (!data.session) router.replace("/login");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      resetSupabaseSyncState();
      setSession(nextSession);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        clearLocalAppData();
        router.replace("/login");
        return;
      }

      if (!nextSession) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090F] text-white">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          Checking your session...
        </div>
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
