"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  type Category,
  loadCategories, saveCategories, generateCategoryId, CATEGORY_COLORS,
} from "@/lib/categoryData";
import { notifyUpdate } from "@/lib/store";


export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; usageCount: number } | null>(null);

  useEffect(() => {
    setCategories(loadCategories());
    const handler = () => setCategories(loadCategories());
    window.addEventListener("habitflow:updated", handler);
    return () => window.removeEventListener("habitflow:updated", handler);
  }, []);

  function persistCategories(updated: Category[]) {
    setCategories(updated);
    saveCategories(updated);
    notifyUpdate();
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    persistCategories([
      ...categories,
      { id: generateCategoryId(), name: newCatName.trim(), color: newCatColor },
    ]);
    setNewCatName("");
    setNewCatColor(CATEGORY_COLORS[0]);
    setShowAddCat(false);
  }

  function saveEditCategory(id: string) {
    if (!editCatName.trim()) return;
    persistCategories(categories.map((c) => c.id === id ? { ...c, name: editCatName.trim() } : c));
    setEditingCatId(null);
  }

  function requestDelete(id: string) {
    deleteCategory(id);
  }

  function deleteCategory(id: string) {
    persistCategories(categories.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  }

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

      {/* Categories */}
      <Panel className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Categories" />
          {!showAddCat && (
            <button
              onClick={() => setShowAddCat(true)}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-violet-600/70 hover:bg-violet-600 transition-colors font-medium"
            >
              + Add Category
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddCat && (
          <div className="mb-4 flex flex-col gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.07]">
            <input
              className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50"
              placeholder="Category name (e.g. Dance Training)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              autoFocus
            />
            <div>
              <p className="text-[10px] text-white/30 mb-2">Color (optional)</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setNewCatColor(c)}
                    className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: newCatColor === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCategory}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={() => { setShowAddCat(false); setNewCatName(""); }}
                className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-sm text-white/60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Category list */}
        {categories.length === 0 && !showAddCat && (
          <p className="text-[12px] text-white/25 py-3">
            No categories yet. Add one to organize your habits and routines.
          </p>
        )}

        <div className="flex flex-col divide-y divide-white/[0.05]">
          {categories.map((cat) => {
            const isEditing = editingCatId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-3 py-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color ?? "#8b5cf6" }}
                />
                {isEditing ? (
                  <input
                    className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500/50"
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditCategory(cat.id);
                      if (e.key === "Escape") setEditingCatId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-white/80">{cat.name}</span>
                )}
                <div className="flex gap-1.5">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEditCategory(cat.id)}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-violet-600/60 hover:bg-violet-600 text-white/70 hover:text-white transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); }}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(cat.id)}
                        className="text-[10px] px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete confirmation */}
        {deleteConfirm && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 flex flex-col gap-2.5">
            <p className="text-[12px] text-white/70">
              This category is used by{" "}
              <span className="text-rose-400 font-medium">{deleteConfirm.usageCount} habit{deleteConfirm.usageCount !== 1 ? "s/routines" : "/routine"}</span>.
              Deleting it will unassign it from all of them.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteCategory(deleteConfirm.id)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
              >
                Delete &amp; Unassign
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
              <p className="text-[11px] text-white/25 mt-0.5 font-mono">{"habitflow-habits"}</p>
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
