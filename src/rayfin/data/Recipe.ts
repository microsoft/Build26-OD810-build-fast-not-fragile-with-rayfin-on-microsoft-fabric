import {
  entity,
  anonymous,
  authenticated,
  uuid,
  text,
  int,
  boolean,
  date,
  set,
  many,
} from '@microsoft/rayfin-core';
import { Like } from './Like.js';
import { Comment } from './Comment.js';

/**
 * A recipe. Visibility controls who can see it:
 *  - private (default): only the creator
 *  - unlisted: anyone with the direct link / id (not surfaced in discovery)
 *  - public: discoverable by everyone
 */
@entity()
@anonymous('read', {
  policy: (_claims, item) => item.visibility.neq('private'),
})
@authenticated('*', {
  policy: (claims, item) =>
    claims.sub.eq(item.user_id).or(item.visibility.neq('private')),
})
export class Recipe {
  @uuid() id!: string;

  /** Stable slug from the seed dataset; empty for user-created recipes. */
  @text({ optional: true }) slug?: string;

  @text() name!: string;
  @text() description!: string;

  @set(
    'main',
    'appetizer',
    'dessert',
    'cocktail',
    'drink',
    'breakfast',
    'snack',
    'side',
    'sauce',
    'bread'
  )
  type!:
    | 'main'
    | 'appetizer'
    | 'dessert'
    | 'cocktail'
    | 'drink'
    | 'breakfast'
    | 'snack'
    | 'side'
    | 'sauce'
    | 'bread';

  @text() cuisine!: string;
  @text() originCountry!: string;

  @int() servings!: number;
  @int() prepTimeMinutes!: number;
  @int() cookTimeMinutes!: number;
  @int() difficulty!: number;

  /** JSON-encoded array of { name, amount, unit, notes } */
  @text() ingredients!: string;

  /** JSON-encoded array of { order, instruction } */
  @text() steps!: string;

  /** JSON-encoded array of allergen strings */
  @text({ default: '[]' }) allergens!: string;

  /** Storage key inside the RecipeImage folder, e.g. `<recipe-id>/cover.jpg` */
  @text({ optional: true }) imageKey?: string;
  @text({ optional: true }) imageAlt?: string;

  @int({ optional: true }) kcalPerServing?: number;
  @boolean({ optional: true }) nutritionEstimated?: boolean;

  @set('private', 'unlisted', 'public')
  visibility!: 'private' | 'unlisted' | 'public';

  /** Auth subject (claims.sub) of the creator. Required for ownership. */
  @uuid() user_id!: string;

  /** Display name captured at creation time so we don't need a Users table. */
  @text({ optional: true }) authorName?: string;

  @date() createdAt!: Date;

  @many(() => Comment) comments?: Comment[];
  @many(() => Like) likes?: Like[];
}
