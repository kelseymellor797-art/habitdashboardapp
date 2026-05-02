import { supabase } from "./supabase";

export const MEDIA_VAULT_BUCKET = "media-vault";
export const STORAGE_MEDIA_URL_PREFIX = "storage-media://";

function safeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "video";
}

export function makeStorageMediaUrl(path: string): string {
  return `${STORAGE_MEDIA_URL_PREFIX}${path}`;
}

export function getStorageMediaPath(url: string): string | null {
  return url.startsWith(STORAGE_MEDIA_URL_PREFIX) ? url.slice(STORAGE_MEDIA_URL_PREFIX.length) : null;
}

export async function uploadPrivateMediaFile(entryId: string, file: File): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in before uploading media.");

  const path = `${userId}/${entryId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_VAULT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "video/mp4",
      upsert: true,
    });

  if (error) throw error;
  return path;
}

export async function createPrivateMediaSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MEDIA_VAULT_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("[media-vault] signed URL failed", error);
    return null;
  }

  return data.signedUrl;
}

export async function deletePrivateMediaFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(MEDIA_VAULT_BUCKET).remove([path]);
  if (error) console.error("[media-vault] delete failed", error);
}
