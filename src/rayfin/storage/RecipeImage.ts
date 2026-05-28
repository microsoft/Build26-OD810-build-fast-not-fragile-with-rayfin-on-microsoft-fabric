import { blob, authenticated } from '@microsoft/rayfin-core';

/**
 * Storage folder for recipe cover images.
 *
 * Every signed-in user can read and upload cover images. Blob paths are
 * namespaced by recipe id, so a cover is effectively only useful when the
 * corresponding Recipe row is also visible to the reader.
 */
@blob()
@authenticated('*')
export class RecipeImage {}
