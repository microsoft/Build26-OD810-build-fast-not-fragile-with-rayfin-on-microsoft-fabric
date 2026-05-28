import { initEmbeddedAuth, ensureSignedInWithFabric } from '@microsoft/rayfin-auth-provider-fabric';
import { client } from './client';

const fabricEnabled = Boolean(
  import.meta.env.VITE_FABRIC_ITEM_ID && import.meta.env.VITE_FABRIC_WORKSPACE_ID
);

const fabricOptions = fabricEnabled
  ? {
      workspaceId: import.meta.env.VITE_FABRIC_WORKSPACE_ID as string,
      projectId: import.meta.env.VITE_FABRIC_ITEM_ID as string,
      fabricPortalUrl:
        (import.meta.env.VITE_FABRIC_PORTAL_URL as string | undefined) ??
        'https://app.fabric.microsoft.com',
      returnOrigin: window.location.origin,
    }
  : null;

/** Call once on app startup. Safe outside embedded Fabric mode (no-op). */
export async function initFabricAuthIfHosted(): Promise<void> {
  if (!fabricOptions) return;
  try {
    await initEmbeddedAuth(client.auth, fabricOptions);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[contoso-chef] initEmbeddedAuth failed:', err);
  }
}

/** Call from a user gesture (button click) when popup-based Fabric SSO is needed. */
export async function signInWithFabric(): Promise<void> {
  if (!fabricOptions) {
    throw new Error(
      'Fabric auth is not configured. Run `npx rayfin up` to deploy the backend — it writes the Fabric IDs into `.env.fabric`.'
    );
  }
  await ensureSignedInWithFabric(client.auth, fabricOptions);
}
