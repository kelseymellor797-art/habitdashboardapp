"use client";

import React from "react";

const SINGLE_USER_EMAIL = process.env.NEXT_PUBLIC_SINGLE_USER_EMAIL ?? "Private dashboard";

export default function SignOutButton() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-[11px] font-bold text-[#06110d] shadow-lg">
        K
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-white">Katrina</div>
        <div className="truncate text-[10px] text-white/35">{SINGLE_USER_EMAIL}</div>
      </div>
    </div>
  );
}
