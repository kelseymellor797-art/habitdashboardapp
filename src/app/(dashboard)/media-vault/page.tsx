"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  deleteLocalMediaFile,
  getLocalMediaId,
  getLocalMediaObjectUrl,
} from "@/lib/localMediaStore";
import {
  createPrivateMediaSignedUrl,
  deletePrivateMediaFile,
  getStorageMediaPath,
  makeStorageMediaUrl,
  uploadPrivateMediaFile,
} from "@/lib/privateMediaStorage";
import {
  generateMediaId,
  loadMediaEntries,
  saveMediaEntries,
  todayDateString,
  type MediaEntry,
  type MediaTag,
} from "@/lib/progressData";

const TAGS: MediaTag[] = [
  "pole",
  "heels",
  "floorwork",
  "freestyle",
  "conditioning",
  "flexibility",
  "combo",
  "performance_ready",
  "needs_work",
  "milestone",
];

const TAG_LABELS: Record<MediaTag, string> = {
  pole: "Pole",
  heels: "Heels",
  floorwork: "Floorwork",
  freestyle: "Freestyle",
  conditioning: "Conditioning",
  flexibility: "Flexibility",
  combo: "Combo",
  performance_ready: "Performance Ready",
  needs_work: "Needs Work",
  milestone: "Milestone",
};

type MediaForm = {
  title: string;
  date: string;
  url: string;
  skillName: string;
  notes: string;
  confidenceRating: number;
  tags: MediaTag[];
};

function emptyForm(): MediaForm {
  return {
    title: "",
    date: todayDateString(),
    url: "",
    skillName: "",
    notes: "",
    confidenceRating: 0,
    tags: [],
  };
}

export default function MediaVaultPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [form, setForm] = useState<MediaForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<MediaTag | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string | null>>({});
  const [storagePreviews, setStoragePreviews] = useState<Record<string, string | null>>({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEntries(loadMediaEntries());
    setMounted(true);
  }, []);

  useEffect(() => {
    entries.forEach((entry) => {
      const localId = getLocalMediaId(entry.url);
      if (!localId || localPreviews[entry.id] !== undefined) return;

      getLocalMediaObjectUrl(localId).then((objectUrl) => {
        setLocalPreviews((prev) => ({ ...prev, [entry.id]: objectUrl }));
      });
    });
  }, [entries, localPreviews]);

  useEffect(() => {
    entries.forEach((entry) => {
      const storagePath = getStorageMediaPath(entry.url);
      if (!storagePath || storagePreviews[entry.id] !== undefined) return;

      createPrivateMediaSignedUrl(storagePath).then((signedUrl) => {
        setStoragePreviews((prev) => ({ ...prev, [entry.id]: signedUrl }));
      });
    });
  }, [entries, storagePreviews]);

  if (!mounted) return null;

  const filteredEntries = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((entry) => {
      if (tagFilter !== "all" && !entry.tags.includes(tagFilter)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return entry.title.toLowerCase().includes(q) || (entry.skillName?.toLowerCase().includes(q) ?? false);
    });

  function persist(next: MediaEntry[]) {
    setEntries(next);
    saveMediaEntries(next);
  }

  function toggleTag(tag: MediaTag) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  async function saveEntry() {
    if (!form.title.trim()) return;
    setIsSaving(true);
    setSaveError("");
    const now = new Date().toISOString();
    const id = editingId ?? generateMediaId();
    const oldEntry = editingId ? entries.find((item) => item.id === editingId) : undefined;
    const oldLocalId = oldEntry ? getLocalMediaId(oldEntry.url) : null;
    const oldStoragePath = oldEntry ? getStorageMediaPath(oldEntry.url) : null;

    if (!selectedFile && !form.url.trim() && !oldEntry?.url) {
      setIsSaving(false);
      return;
    }

    let url = selectedFile ? "" : form.url.trim();

    try {
      if (selectedFile) {
        const path = await uploadPrivateMediaFile(id, selectedFile);
        url = makeStorageMediaUrl(path);
        if (oldLocalId) await deleteLocalMediaFile(oldLocalId);
        if (oldStoragePath && oldStoragePath !== path) await deletePrivateMediaFile(oldStoragePath);
        const signedUrl = await createPrivateMediaSignedUrl(path);
        setStoragePreviews((prev) => ({ ...prev, [id]: signedUrl }));
        setLocalPreviews((prev) => ({ ...prev, [id]: null }));
      } else if (oldEntry?.url && !form.url.trim()) {
        url = oldEntry.url;
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not upload this video.");
      setIsSaving(false);
      return;
    }

    const entry: MediaEntry = {
      id,
      title: form.title.trim(),
      date: form.date,
      url,
      tags: form.tags,
      skillName: form.skillName.trim() || undefined,
      confidenceRating: form.confidenceRating || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: editingId ? oldEntry?.createdAt ?? now : now,
    };

    persist(editingId ? entries.map((item) => item.id === editingId ? entry : item) : [...entries, entry]);
    setForm(emptyForm());
    setEditingId(null);
    setSelectedFile(null);
    setIsSaving(false);
  }

  function editEntry(entry: MediaEntry) {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      date: entry.date,
      url: entry.url,
      skillName: entry.skillName ?? "",
      notes: entry.notes ?? "",
      confidenceRating: entry.confidenceRating ?? 0,
      tags: [...entry.tags],
    });
    setSelectedFile(null);
  }

  async function deleteEntry(id: string) {
    const entry = entries.find((item) => item.id === id);
    const localId = entry ? getLocalMediaId(entry.url) : null;
    const storagePath = entry ? getStorageMediaPath(entry.url) : null;
    if (localId) await deleteLocalMediaFile(localId);
    if (storagePath) await deletePrivateMediaFile(storagePath);
    persist(entries.filter((entry) => entry.id !== id));
    setLocalPreviews((prev) => {
      const next = { ...prev };
      const objectUrl = next[id];
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      delete next[id];
      return next;
    });
    setStoragePreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
      setSelectedFile(null);
    }
  }

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40";

  return (
    <div className="max-w-6xl space-y-5">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold text-white">Media Vault</h1>
        <p className="mt-0.5 text-[12px] text-white/30">
          Save local videos or private clip links with notes, tags, related skills, and confidence ratings.
        </p>
      </div>

      <Panel>
        <SectionTitle title={editingId ? "Edit Clip" : "Add Clip"} />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input className={inputClass} placeholder="Clip title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <input type="date" className={inputClass} value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          <input
            type="file"
            accept="video/*"
            className={inputClass + " file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#07100d]"}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              if (file && !form.title.trim()) {
                setForm((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
              }
            }}
          />
          <input type="url" className={inputClass} placeholder="Optional private URL" value={form.url.startsWith("local-media://") ? "" : form.url} onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))} />
          <input className={inputClass} placeholder="Related skill / combo / move" value={form.skillName} onChange={(event) => setForm((prev) => ({ ...prev, skillName: event.target.value }))} />
          <textarea className={inputClass + " resize-none lg:col-span-2"} rows={3} placeholder="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        {selectedFile && (
          <p className="mt-2 text-[12px] text-emerald-200/75">
            Selected file: {selectedFile.name}. It will upload to your private Supabase Storage bucket.
          </p>
        )}
        {saveError && (
          <p className="mt-2 rounded-lg border border-red-400/15 bg-red-400/[0.06] px-3 py-2 text-[12px] text-red-100">
            {saveError}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-[12px] ${
                form.tags.includes(tag)
                  ? "border-violet-500/30 bg-violet-500/20 text-violet-200"
                  : "border-white/[0.08] bg-white/[0.03] text-white/35"
              }`}
            >
              {TAG_LABELS[tag]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-white/35">Confidence</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, confidenceRating: prev.confidenceRating === rating ? 0 : rating }))}
                className="text-lg"
              >
                {rating <= form.confidenceRating ? "★" : "☆"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={saveEntry}
            disabled={isSaving || !form.title.trim() || (!selectedFile && !form.url.trim() && !editingId)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "Saving..." : editingId ? "Save Clip" : "Add Clip"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm(emptyForm()); }}
              className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-white/45 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-white/35">Tag filter</label>
            <select className={inputClass} value={tagFilter} onChange={(event) => setTagFilter(event.target.value as MediaTag | "all")}>
              <option value="all">All tags</option>
              {TAGS.map((tag) => <option key={tag} value={tag}>{TAG_LABELS[tag]}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-white/35">Search</label>
            <input className={inputClass} placeholder="Search title or skill" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <p className="text-[12px] text-white/35">{filteredEntries.length} clip{filteredEntries.length === 1 ? "" : "s"}</p>
        </div>
      </Panel>

      {filteredEntries.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-sm text-white/35">No media clips match this view.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEntries.map((entry) => (
            <Panel key={entry.id} className="flex flex-col gap-3" hoverable>
              <div>
                <p className="font-semibold text-white">{entry.title}</p>
                <p className="text-[11px] text-white/30">{entry.date}{entry.skillName ? ` · ${entry.skillName}` : ""}</p>
              </div>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">
                      {TAG_LABELS[tag]}
                    </span>
                  ))}
                </div>
              )}
              {entry.confidenceRating && (
                <p className="text-[12px] text-amber-300">{"★".repeat(entry.confidenceRating)}{"☆".repeat(5 - entry.confidenceRating)}</p>
              )}
              {getStorageMediaPath(entry.url) ? (
                storagePreviews[entry.id] ? (
                  <video controls className="aspect-video w-full rounded-lg border border-white/[0.08] bg-black object-contain" src={storagePreviews[entry.id] ?? undefined} />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 px-3 text-center text-[12px] text-white/35">
                    Preparing private playback link.
                  </div>
                )
              ) : getLocalMediaId(entry.url) ? (
                localPreviews[entry.id] ? (
                  <video controls className="aspect-video w-full rounded-lg border border-white/[0.08] bg-black object-contain" src={localPreviews[entry.id] ?? undefined} />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 px-3 text-center text-[12px] text-white/35">
                    This older local file is only available in the browser where it was imported.
                  </div>
                )
              ) : null}
              {entry.notes && <p className="text-[12px] leading-relaxed text-white/45">{entry.notes}</p>}
              <div className="mt-auto flex gap-2">
                {entry.url && !getLocalMediaId(entry.url) && !getStorageMediaPath(entry.url) && (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-violet-500/15 px-3 py-1.5 text-center text-[12px] text-violet-200 hover:bg-violet-500/25">
                    Open clip
                  </a>
                )}
                <button type="button" onClick={() => editEntry(entry)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/45 hover:text-white">
                  Edit
                </button>
                <button type="button" onClick={() => deleteEntry(entry.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-[12px] text-red-300/70 hover:text-red-300">
                  Delete
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
