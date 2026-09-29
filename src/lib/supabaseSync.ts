import { notifyAppDataUpdated } from "./appEvents";
import { isSupabaseConfigured, supabase } from "./supabase";

type SupabaseRow = object;

type SyncOptions<T, R extends SupabaseRow> = {
  key: string;
  table: string;
  localData: T[];
  readCache: () => T[];
  writeCache: (items: T[]) => void;
  fromRow: (row: R) => T;
  toRow: (item: T) => R;
  orderBy?: string;
};

const loadedKeys = new Set<string>();
const LOCAL_DATA_PREFIXES = ["habitflow-", "wellness-", "danceflow-"];

function logSyncError(action: string, table: string, error: unknown): void {
  console.warn(`[supabase:${table}] ${action} failed; using local data until sync recovers`, error);
}

function idsFilter(ids: string[]): string {
  return `(${ids.map((id) => `"${id.replaceAll('"', '\\"')}"`).join(",")})`;
}

async function fetchRows<R extends SupabaseRow>(table: string, orderBy?: string): Promise<R[]> {
  let query = supabase.from(table).select("*");
  if (orderBy) query = query.order(orderBy);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as R[];
}

async function hasSession(): Promise<boolean> {
  // In single-user mode a fixed user id (NEXT_PUBLIC_SINGLE_USER_ID) represents a signed-in state
  if (process.env.NEXT_PUBLIC_SINGLE_USER_ID) return true;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function getUserId(): Promise<string | null> {
  const single = process.env.NEXT_PUBLIC_SINGLE_USER_ID;
  if (single) return single;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function withUserId<R extends SupabaseRow>(rows: R[], userId: string): Array<R & { user_id: string }> {
  return rows.map((row) => ({ ...row, user_id: userId }));
}

function stableItemKey(item: unknown): string {
  if (!item || typeof item !== "object") return JSON.stringify(item);
  const record = item as Record<string, unknown>;
  if (typeof record.id === "string") return `id:${record.id}`;
  if (typeof record.habitId === "string" && typeof record.date === "string") {
    return `habit:${record.habitId}:${record.date}`;
  }
  if (typeof record.habit_id === "string" && typeof record.date === "string") {
    return `habit:${record.habit_id}:${record.date}`;
  }
  if (typeof record.routineId === "string" && typeof record.date === "string") {
    return `routine:${record.routineId}:${record.date}`;
  }
  if (typeof record.routine_id === "string" && typeof record.date === "string") {
    return `routine:${record.routine_id}:${record.date}`;
  }
  if (typeof record.skillId === "string" && typeof record.date === "string") {
    return `skill:${record.skillId}:${record.date}`;
  }
  if (typeof record.skill_id === "string" && typeof record.date === "string") {
    return `skill:${record.skill_id}:${record.date}`;
  }
  if (typeof record.date === "string") return `date:${record.date}`;
  return JSON.stringify(item);
}

function mergeCollections<T>(remoteItems: T[], localItems: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of remoteItems) merged.set(stableItemKey(item), item);
  for (const item of localItems) merged.set(stableItemKey(item), item);
  return Array.from(merged.values());
}

export function resetSupabaseSyncState(): void {
  loadedKeys.clear();
}

export function clearLocalAppData(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (LOCAL_DATA_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
  resetSupabaseSyncState();
  notifyAppDataUpdated();
}

export function syncCollection<T, R extends SupabaseRow>({
  key,
  table,
  localData,
  readCache,
  writeCache,
  fromRow,
  toRow,
  orderBy,
}: SyncOptions<T, R>): void {
  if (!isSupabaseConfigured || loadedKeys.has(key)) return;
  loadedKeys.add(key);

  void (async () => {
    try {
      if (!(await hasSession())) return;
      const rows = await fetchRows<R>(table, orderBy);
      if (rows.length > 0) {
        const remoteData = rows.map(fromRow);
        const cacheData = readCache();
        const mergedData = cacheData.length > 0 ? mergeCollections(remoteData, cacheData) : remoteData;
        writeCache(mergedData);
        if (cacheData.length > 0 && mergedData.length > remoteData.length) {
          const { error } = await supabase.from(table).upsert(mergedData.map(toRow));
          if (error) throw error;
        }
        notifyAppDataUpdated();
        return;
      }

      const seed = localData.length > 0 ? localData : readCache();
      if (seed.length > 0) {
        const { error } = await supabase.from(table).upsert(seed.map(toRow));
        if (error) throw error;
      }
    } catch (error) {
      loadedKeys.delete(key);
      logSyncError("load", table, error);
    }
  })();
}

export function saveRemoteCollection<T, R extends SupabaseRow>(
  table: string,
  items: T[],
  toRow: (item: T) => R,
  deleteColumn = "id",
): void {
  if (!isSupabaseConfigured) return;

  void (async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      if (items.length === 0) return;
      const rows = withUserId(items.map(toRow), userId);
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .not(deleteColumn, "is", null);
      if (deleteError) throw deleteError;
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from(table).insert(rows);
        if (insertError) throw insertError;
      }
    } catch (error) {
      logSyncError("save", table, error);
    }
  })();
}

export function saveRemoteCollectionById<T, R extends SupabaseRow>(
  table: string,
  idColumn: string,
  items: T[],
  getId: (item: T) => string,
  toRow: (item: T) => R,
  options: { onConflict?: string } = {},
): void {
  if (!isSupabaseConfigured) return;

  void (async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      if (items.length === 0) return;
      const rows = withUserId(items.map(toRow), userId);
      const ids = items.map(getId);

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from(table)
          .upsert(rows, options.onConflict ? { onConflict: options.onConflict } : undefined);
        if (upsertError) throw upsertError;
      }

      const deleteQuery = supabase.from(table).delete();
      const { error: deleteError } =
        ids.length > 0
          ? await deleteQuery.not(idColumn, "in", idsFilter(ids))
          : await deleteQuery.not(idColumn, "is", null);
      if (deleteError) throw deleteError;
    } catch (error) {
      logSyncError("save", table, error);
    }
  })();
}
