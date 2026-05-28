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
 * A comment posted on a recipe.
 *
 * Per the SPEC:
 *   "Users can comment on recipes that they can view (public, unlisted if they
 *   have the link, and private if they are the creator).
 *   Only the creator of the recipe can delete comments on their recipes."
 *
 * Rayfin policies only see `claims` and the comment row itself, so the
 * recipe's visibility + owner are denormalized onto the Comment as
 * `recipe_visibility` and `recipe_user_id`. The UI fills these from the
 * loaded Recipe when creating a comment.
 *
 * Permissions:
 *  - **read** is allowed when the recipe is non-private (so any signed-in
 *    viewer can see public/unlisted comment threads), OR the caller owns the
 *    parent recipe, OR the caller authored the comment.
 *  - **create** requires authentication and the same visibility constraint
 *    (you can only comment on a recipe you can view).
 *  - **update** is restricted to the comment author.
 *  - **delete** is restricted to the recipe owner OR the comment author.
 *  - Unlisted recipes only block discovery: someone who already knows the id
 *    can read & post comments on them, matching the spec.
 */
@entity()
@authenticated<Comment>('read', {
  policy: (claims, item) =>
    item.recipe_visibility
      .neq('private')
      .or(claims.sub.eq(item.recipe_user_id))
      .or(claims.sub.eq(item.user_id)),
})
@authenticated<Comment>('create', {
  policy: (claims, item) =>
    item.recipe_visibility
      .neq('private')
      .or(claims.sub.eq(item.recipe_user_id))
      .or(claims.sub.eq(item.user_id)),
})
@authenticated<Comment>('update', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
@authenticated<Comment>('delete', {
  policy: (claims, item) =>
    claims.sub.eq(item.recipe_user_id).or(claims.sub.eq(item.user_id)),
})
export class Comment {
  @uuid() id!: string;

  @uuid() recipe_id!: string;
  @one(() => Recipe) recipe?: Recipe;

  /** Author of the comment. */
  @uuid() user_id!: string;

  /** Display name captured at write time so the comments list is meaningful. */
  @text({ optional: true }) userName?: string;

  /** Comment body. Plain text, capped on the client at a reasonable length. */
  @text() body!: string;

  /** Denormalized visibility of the parent recipe — see class doc. */
  @text() recipe_visibility!: string;

  /** Denormalized owner of the parent recipe — see class doc. */
  @uuid() recipe_user_id!: string;

  @date() createdAt!: Date;
}
