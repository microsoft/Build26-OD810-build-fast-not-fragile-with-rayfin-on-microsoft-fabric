import { blob, anonymous } from '@microsoft/rayfin-core';

/**
 * Storage folder for recipe cover images.
 *
 * NOTE: Rayfin storage currently scopes objects by their uploader's owner id,
 * so anonymous-readable cover images must also be uploaded as anonymous. The
 * frontend therefore uploads cover images via an unauthenticated client; the
 * blob path is namespaced by recipe id, so it is effectively unlisted unless
 * the corresponding Recipe row is also visible to the reader.
 */
@blob()
@anonymous('*')
export class RecipeImage {}
