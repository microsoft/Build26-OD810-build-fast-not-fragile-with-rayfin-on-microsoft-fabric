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
   *   Keeps writes to a single round-trip; ideal for small covers.
   * - `storage`: upload to Rayfin storage as a blob via
   *   [src/lib/storage.ts](./lib/storage.ts). Works against both local dev
   *   and the deployed Fabric backend.
   */
  readonly VITE_STORAGE_MODE?: 'inline' | 'storage';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
