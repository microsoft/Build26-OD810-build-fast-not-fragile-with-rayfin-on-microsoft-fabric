import {
  entity,
  authenticated,
  uuid,
  text,
  date,
  one,
} from '@microsoft/rayfin-core';
import { Recipe } from './Recipe.js';

/**
 * A user's like (favorite) for a recipe.
 *
 * Any signed-in user can read all likes (so the UI can show like counts on
 * recipes they can see). Only the like's owner can create or delete their
 * own likes — enforced by the policy on user_id.
 */
@entity()
@authenticated('read')
@authenticated<Like>(['create', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Like {
  @uuid() id!: string;

  /** Auth subject of the user who liked the recipe. */
  @uuid() user_id!: string;

  /** Display name captured at like time so the "who liked this" list is meaningful. */
  @text({ optional: true }) userName?: string;

  @uuid() recipe_id!: string;
  @one(() => Recipe) recipe?: Recipe;

  @date() createdAt!: Date;
}
