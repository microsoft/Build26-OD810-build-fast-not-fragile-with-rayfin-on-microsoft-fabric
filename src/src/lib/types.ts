export type Visibility = 'private' | 'unlisted' | 'public';

export type RecipeType =
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

export const RECIPE_TYPES: RecipeType[] = [
  'main',
  'appetizer',
  'dessert',
  'cocktail',
  'drink',
  'breakfast',
  'snack',
  'side',
  'sauce',
  'bread',
];

export const ALLERGENS = [
  'gluten',
  'milk',
  'egg',
  'peanut',
  'tree_nuts',
  'soy',
  'fish',
  'shellfish',
  'sesame',
  'mustard',
  'celery',
  'sulfites',
  'lupin',
  'mollusks',
] as const;

export type Allergen = (typeof ALLERGENS)[number];

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  notes: string;
}

export interface Step {
  order: number;
  instruction: string;
}

export interface RecipeView {
  id: string;
  slug?: string;
  name: string;
  description: string;
  type: RecipeType;
  cuisine: string;
  originCountry: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: number;
  ingredients: Ingredient[];
  steps: Step[];
  allergens: Allergen[];
  imageKey?: string;
  imageAlt?: string;
  kcalPerServing?: number;
  nutritionEstimated?: boolean;
  visibility: Visibility;
  user_id: string;
  authorName?: string;
  createdAt: string;
}

export interface RecipeRow {
  id: string;
  slug?: string | null;
  name: string;
  description: string;
  type: RecipeType;
  cuisine: string;
  originCountry: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: number;
  ingredients: string;
  steps: string;
  allergens: string;
  imageKey?: string | null;
  imageAlt?: string | null;
  kcalPerServing?: number | null;
  nutritionEstimated?: boolean | null;
  visibility: Visibility;
  user_id: string;
  authorName?: string | null;
  createdAt: string;
}

export function rowToView(row: RecipeRow): RecipeView {
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    name: row.name,
    description: row.description,
    type: row.type,
    cuisine: row.cuisine,
    originCountry: row.originCountry,
    servings: row.servings,
    prepTimeMinutes: row.prepTimeMinutes,
    cookTimeMinutes: row.cookTimeMinutes,
    difficulty: row.difficulty,
    ingredients: safeParse(row.ingredients, []) as Ingredient[],
    steps: safeParse(row.steps, []) as Step[],
    allergens: safeParse(row.allergens, []) as Allergen[],
    imageKey: row.imageKey ?? undefined,
    imageAlt: row.imageAlt ?? undefined,
    kcalPerServing: row.kcalPerServing ?? undefined,
    nutritionEstimated: row.nutritionEstimated ?? undefined,
    visibility: row.visibility,
    user_id: row.user_id,
    authorName: row.authorName ?? undefined,
    createdAt: row.createdAt,
  };
}

function safeParse<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}
