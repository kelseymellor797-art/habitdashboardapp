"use client";

import React from "react";
import { resetSupabaseSyncState } from "@/lib/supabaseSync";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  // Single-user mode: do not require interactive sign-in. Keep sync state behavior.
  React.useEffect(() => {
    resetSupabaseSyncState();
  }, []);

  return <>{children}</>;
}
