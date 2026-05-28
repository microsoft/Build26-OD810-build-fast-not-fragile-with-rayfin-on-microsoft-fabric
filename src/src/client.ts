import { RayfinClient } from '@microsoft/rayfin-client';
import type { ApiClient } from '@microsoft/rayfin-lib';
import type { AppSchema } from '../rayfin/data/schema';

const baseUrl = import.meta.env.VITE_RAYFIN_API_URL;
const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;

if (!baseUrl || !publishableKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[contoso-chef] Missing VITE_RAYFIN_API_URL or VITE_RAYFIN_PUBLISHABLE_KEY. ' +
      'Run `npx rayfin dev` and copy the publishable key into .env.'
  );
}

// The Rayfin SDK auto-extracts the project moniker from the base URL's last
// GUID and adds the `x-workload-resource-moniker` header on every request,
// so we don't need to inject any extra headers here.
export const client = new RayfinClient<AppSchema>({
  baseUrl,
  publishableKey,
  authStorage: true,
});

/**
 * The same ApiClient the RayfinClient uses internally. Storage requests need
 * to go through this so they pick up the moniker header, bearer token, URL
 * concatenation rules (which differ between local and Fabric), and 401-refresh
 * behaviour. The Rayfin storage SDK builds its URLs with `new URL(path, base)`
 * which strips the path component of the Fabric base URL — so we bypass it
 * with direct `requestRaw` calls.
 */
export const apiClient: ApiClient = (client as unknown as { apiClient: ApiClient }).apiClient;
