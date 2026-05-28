/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAYFIN_API_URL: string;
  readonly VITE_RAYFIN_PUBLISHABLE_KEY: string;
  readonly VITE_FABRIC_ITEM_ID?: string;
  readonly VITE_FABRIC_WORKSPACE_ID?: string;
  readonly VITE_FABRIC_PORTAL_URL?: string;
  /**
   * Where to put user-uploaded recipe cover images.
   * - `inline` (default): base64-encode and store on the Recipe row directly.
   *   Workaround while the Rayfin storage data plane is broken on Fabric.
   * - `storage`: upload to Rayfin storage as a blob (works locally; broken on
   *   Fabric until upstream fixes the `TenantResolutionMiddleware` issue).
   */
  readonly VITE_STORAGE_MODE?: 'inline' | 'storage';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
