import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-white/[0.05] first:border-t-0">
      <div>
        <p className="text-[13px] text-white/70">{label}</p>
        {description && <p className="text-[11px] text-white/30 mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[700px]">
      <div className="pb-3 border-b border-white/[0.06]">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Panel>
        <SectionTitle title="Profile" />
        <SettingsRow label="Name" description="Your display name across the app">
          <span className="text-[12px] text-white/50 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5">Katrina</span>
        </SettingsRow>
        <SettingsRow label="Plan" description="Your current subscription tier">
          <span className="text-[11px] text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">Free plan</span>
        </SettingsRow>
        <SettingsRow label="Member since" description="Account creation date">
          <span className="text-[12px] text-white/35">January 2025</span>
        </SettingsRow>
      </Panel>

      {/* Appearance */}
      <Panel>
        <SectionTitle title="Appearance" />
        <SettingsRow label="Theme" description="Color scheme for the dashboard">
          <span className="text-[11px] text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">Dark</span>
        </SettingsRow>
        <SettingsRow label="Font size" description="Adjust text size across the app">
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">Default</span>
        </SettingsRow>
      </Panel>

      {/* Data & Storage */}
      <Panel>
        <SectionTitle title="Data & Storage" />
        <SettingsRow label="Storage key" description="localStorage key used for habit data">
          <code className="text-[10px] text-white/30 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1">
            habitflow-completions-jan2025
          </code>
        </SettingsRow>
        <SettingsRow label="Export data" description="Download your habit data as JSON">
          <button className="text-[11px] text-white/50 bg-white/[0.04] hover:bg-white/[0.07] hover:text-white/70 border border-white/[0.07] transition-colors rounded-lg px-3 py-1.5">
            Export JSON
          </button>
        </SettingsRow>
        <SettingsRow label="Clear data" description="Reset all habit completions to defaults">
          <button className="text-[11px] text-white/40 bg-white/[0.04] hover:bg-amber-500/10 hover:text-amber-400 border border-white/[0.07] hover:border-amber-500/20 transition-colors rounded-lg px-3 py-1.5">
            Clear Storage
          </button>
        </SettingsRow>
      </Panel>

      {/* Notifications */}
      <Panel>
        <SectionTitle title="Notifications" />
        <div className="flex items-center justify-between py-2">
          <p className="text-[12px] text-white/40">Notification settings are not yet available</p>
          <span className="text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-0.5">Coming soon</span>
        </div>
      </Panel>

      {/* Danger Zone */}
      <Panel>
        <SectionTitle title="Danger Zone" />
        <SettingsRow label="Delete account" description="Permanently delete your account and all data. This cannot be undone.">
          <button className="text-[11px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 transition-colors rounded-lg px-3 py-1.5">
            Delete Account
          </button>
        </SettingsRow>
      </Panel>
    </div>
  );
}
