/**
 * Storage helpers — direct fetch with manual URL building.
 *
 * Why this exists:
 *
 * Both the Rayfin storage SDK (`@microsoft/rayfin-storage`) and the lower-level
 * `ApiClient.requestRaw()` build their request URLs with `new URL(path, baseUrl)`.
 * When `path` starts with `/`, the URL constructor treats it as host-relative
 * and DROPS the path component of `baseUrl`. That breaks every storage call
 * against a Microsoft Fabric backend, whose baseUrl looks like
 *   `https://host/webapi/capacities/.../appbackends/<id>`
 * because the resulting URL becomes `https://host/storage/...` — a host with
 * no Rayfin endpoint, hence the CORS-less 5xx the browser surfaces as a CORS
 * error. (The data SDK uses the SDK's private `buildUrl()` helper which does
 * string concatenation correctly; only `requestRaw` and the storage SDK are
 * affected.)
 *
 * The fix here:
 *   1. Build URLs ourselves with the same string-concat logic as `buildUrl`.
 *   2. Fetch directly, calling `apiClient.prepareHeaders(...)` (private, but
 *      accessed via cast) so the publishable key, the
 *      `x-workload-resource-moniker` header, and the bearer token are all
 *      injected by the same code path the rest of the SDK uses.
 *
 * In Vite dev the `baseUrl` is empty (the SDK auto-rewrites it so requests
 * go through the dev proxy) so URLs come out as `/storage/...` — exactly what
 * we need to hit the local backend through the proxy.
 */

import { apiClient } from '../client';

const FOLDER = 'recipeimage';

function buildPath(name: string, prefix: string): string {
  const qp = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  return `/storage/${FOLDER}/${encodeURIComponent(name)}${qp}`;
}

/**
 * Mirrors @microsoft/rayfin-lib `ApiClient.buildUrl` (which is private).
 * We read the effective baseUrl off the ApiClient instance — the SDK rewrites
 * it to `""` in Vite dev so requests go through the dev proxy, and we want
 * the same behaviour here.
 */
function buildFullUrl(path: string): string {
  const internal = apiClient as unknown as { baseUrl: string };
  const base = (internal.baseUrl ?? '').replace(/\/+$/, '');
  if (!base) return path; // dev: empty baseUrl + Vite proxy at /storage/*
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Reuse the SDK's header preparation for `X-Publishable-Key`,
 * `x-workload-resource-moniker`, and the bearer token. We additionally set
 * `X-Ms-Workload-Resource-Moniker` (different casing, `-Ms-` prefix) which
 * the Microsoft Fabric API gateway uses to populate `IProjectContext` for
 * the storage service — without it, storage requests reach the right URL but
 * fail with "Project settings have not been resolved" inside Fabric.
 *
 * `prepareHeaders` is marked private but it's a stable instance method on
 * the very ApiClient the rest of the app already uses.
 */
function prepareHeaders(extra?: Record<string, string>): Headers {
  const internal = apiClient as unknown as {
    prepareHeaders: (h?: Record<string, string>) => Headers;
    baseUrl: string;
  };
  const headers = internal.prepareHeaders(extra ?? {});
  // Mirror the moniker the gateway expects. extractLastGuid logic, inlined.
  const guidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const matches = (internal.baseUrl ?? '').match(guidPattern);
  const moniker = matches ? matches[matches.length - 1] : undefined;
  if (moniker) headers.set('X-Ms-Workload-Resource-Moniker', moniker);
  return headers;
}

export interface RecipeImageDownload {
  blob: Blob;
}

export async function downloadRecipeImage(
  name: string,
  prefix: string,
  signal?: AbortSignal
): Promise<RecipeImageDownload> {
  const url = buildFullUrl(buildPath(name, prefix));
  const res = await fetch(url, {
    method: 'GET',
    headers: prepareHeaders(),
    signal,
  });
  if (!res.ok) {
    const code = res.status === 404 ? 'NotFound' : `HTTP_${res.status}`;
    const err = new Error(`Storage download failed (${code})`) as Error & { code?: string };
    err.code = code;
    throw err;
  }
  return { blob: await res.blob() };
}

export async function uploadRecipeImageBlob(
  prefix: string,
  name: string,
  blob: Blob,
  contentType: string,
  signal?: AbortSignal
): Promise<void> {
  const url = buildFullUrl(buildPath(name, prefix));

  // Delete first (no-op if missing) so re-runs don't conflict on
  // existing-but-stale metadata.
  await fetch(url, {
    method: 'DELETE',
    headers: prepareHeaders(),
    signal,
  }).catch(() => undefined);

  const res = await fetch(url, {
    method: 'PUT',
    headers: prepareHeaders({ 'Content-Type': contentType || 'application/octet-stream' }),
    body: blob,
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage upload failed (HTTP ${res.status}) ${text}`);
  }
}
