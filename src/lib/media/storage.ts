/**
 * Supabase Storage helpers for the media engine (Phase 4 — Track A).
 *
 * All generated media (audio, images, thumbnails, subtitle files) is uploaded
 * to the `media` bucket under a per-user folder (`<userId>/<type>/<uuid>.<ext>`)
 * and stored as a durable public URL on the `assets` row — replacing the old
 * data-URI / external-link approach. Uploads run under the user's session, so
 * the storage RLS policies (see migrations/0004_phase4_storage.sql) restrict
 * each user to their own folder.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { fetchWithTimeout } from "@/lib/http";

/** Hard cap on remote media pulled into the media bucket (100 MB) — guards the
 *  serverless function from OOMing on a huge/hostile upstream. */
const MAX_UPLOAD_BYTES = 100_000_000;

export const MEDIA_BUCKET = "media";

export type UploadResult = { url: string; path: string; size: number };

type UploadInput = {
  userId: string;
  type: string; // image | audio | thumbnail | subtitle
  bytes: Buffer | Uint8Array;
  contentType: string;
  ext: string;
};

/** Upload raw bytes to the media bucket and return the public URL + path. */
export async function uploadMedia(
  supabase: SupabaseClient,
  { userId, type, bytes, contentType, ext }: UploadInput
): Promise<UploadResult> {
  const path = `${userId}/${type}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, size: bytes.byteLength };
}

type UploadFromUrlInput = {
  userId: string;
  type: string;
  sourceUrl: string;
  ext: string;
  contentType?: string;
};

/** Fetch a remote file (e.g. a provider URL) and upload it to the media bucket. */
export async function uploadFromUrl(
  supabase: SupabaseClient,
  { userId, type, sourceUrl, ext, contentType }: UploadFromUrlInput
): Promise<UploadResult> {
  const res = await fetchWithTimeout(sourceUrl, {}, 30_000);
  if (!res.ok) throw new Error(`Failed to fetch source media (${res.status})`);
  const declaredSize = Number(res.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_UPLOAD_BYTES) {
    throw new Error(`Source media too large (${declaredSize} bytes > ${MAX_UPLOAD_BYTES} limit)`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const ct = contentType || res.headers.get("content-type") || "application/octet-stream";
  return uploadMedia(supabase, { userId, type, bytes, contentType: ct, ext });
}

/** Remove an object from the media bucket (best-effort; used on asset delete). */
export async function deleteMedia(supabase: SupabaseClient, path: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
