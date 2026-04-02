import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import { STORAGE_KEY } from "@/lib/habitData";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile */}
      <Panel className="flex flex-col">
        <SectionTitle title="Profile" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
            K
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold text-white">Katrina</span>
            <span className="text-[11px] text-white/35">habit.flow@example.com</span>
            <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 w-fit mt-1">
              Free Plan
            </span>
          </div>
          <div className="ml-auto">
            <button className="text-[11px] text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-lg px-3 py-2 transition-colors">
              Edit Profile
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-3 gap-4">
          {[
            { label: "Member Since", value: "Jan 2025" },
            { label: "Habits Tracked", value: "7" },
            { label: "Days Active", value: "24" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 bg-[#080B12] rounded-lg p-3">
              <span className="text-[10px] text-white/25 uppercase tracking-widest">{label}</span>
              <span className="text-[15px] font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Appearance */}
      <Panel className="flex flex-col">
        <SectionTitle title="Appearance" />
        <div className="flex flex-col divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] text-white/70">Theme</p>
              <p className="text-[11px] text-white/30 mt-0.5">Color scheme for the interface</p>
            </div>
            <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1">
              Dark Mode Only
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] text-white/70">Font Size</p>
              <p className="text-[11px] text-white/30 mt-0.5">Adjust the base font size</p>
            </div>
            <div className="flex gap-1.5">
              {["S", "M", "L"].map((size, i) => (
                <button
                  key={size}
                  className={`w-8 h-8 rounded-md text-[11px] font-medium transition-colors border ${i === 1 ? "bg-white/[0.08] border-white/[0.15] text-white" : "bg-white/[0.03] border-white/[0.07] text-white/30"}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] text-white/70">Compact Mode</p>
              <p className="text-[11px] text-white/30 mt-0.5">Reduce spacing and padding</p>
            </div>
            <div className="w-10 h-5 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center px-0.5">
              <div className="w-4 h-4 rounded-full bg-white/25" />
            </div>
          </div>
        </div>
      </Panel>

      {/* Data & Storage */}
      <Panel className="flex flex-col">
        <SectionTitle title="Data & Storage" />
        <div className="flex flex-col divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] text-white/70">Storage Key</p>
              <p className="text-[11px] text-white/25 mt-0.5 font-mono">{STORAGE_KEY}</p>
            </div>
            <span className="text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.07] rounded-full px-2.5 py-1">localStorage</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] text-white/70">Export Data</p>
              <p className="text-[11px] text-white/30 mt-0.5">Download all habit data as JSON</p>
            </div>
            <button className="text-[11px] font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 rounded-lg px-3 py-1.5 transition-colors">
              Export JSON
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[12px] text-white/70">Clear Data</p>
              <p className="text-[11px] text-white/30 mt-0.5">Remove all completion data from localStorage</p>
            </div>
            <button className="text-[11px] font-medium text-rose-400/70 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 rounded-lg px-3 py-1.5 transition-colors">
              Clear Data
            </button>
          </div>
        </div>
      </Panel>

      {/* Notifications */}
      <Panel className="flex flex-col">
        <SectionTitle title="Notifications" />
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm">
            🔔
          </div>
          <div>
            <p className="text-[12px] text-white/60">Push notifications and reminders</p>
            <p className="text-[11px] text-white/25 mt-0.5">This feature is coming in a future update</p>
          </div>
          <span className="ml-auto text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
            Coming Soon
          </span>
        </div>
      </Panel>

      {/* Danger Zone */}
      <Panel className="flex flex-col border-rose-500/20">
        <SectionTitle title="Danger Zone" />
        <div className="flex items-center justify-between py-2 px-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.04]">
          <div>
            <p className="text-[12px] text-white/70">Delete Account</p>
            <p className="text-[11px] text-white/30 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <button className="ml-4 shrink-0 text-[11px] font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg px-4 py-2 transition-colors">
            Delete Account
          </button>
        </div>
      </Panel>
    </div>
  );
}
