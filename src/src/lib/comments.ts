import { client } from '../client';

export interface CommentRow {
  id: string;
  recipe_id: string;
  user_id: string;
  userName?: string | null;
  body: string;
  createdAt: string;
}

const COMMENT_FIELDS = [
  'id',
  'recipe_id',
  'user_id',
  'userName',
  'body',
  'createdAt',
] as const;

export async function listCommentsForRecipe(recipeId: string): Promise<CommentRow[]> {
  const rows = (await client.data.Comment
    .select(COMMENT_FIELDS)
    .where({ recipe_id: { eq: recipeId } })
    .orderBy({ createdAt: 'desc' })
    .first(200)
    .execute()) as unknown as CommentRow[];
  return rows;
}

export interface CreateCommentInput {
  recipeId: string;
  body: string;
  userId: string;
  userName?: string | null;
  /** Visibility of the parent recipe — denormalized onto the comment row. */
  recipeVisibility: 'private' | 'unlisted' | 'public';
  /** Owner of the parent recipe — denormalized onto the comment row. */
  recipeUserId: string;
}

export async function createComment(input: CreateCommentInput): Promise<CommentRow> {
  const created = (await client.data.Comment.create({
    recipe_id: input.recipeId,
    user_id: input.userId,
    userName: input.userName ?? undefined,
    body: input.body,
    recipe_visibility: input.recipeVisibility,
    recipe_user_id: input.recipeUserId,
    createdAt: new Date(),
  } as never)) as unknown as CommentRow;
  return created;
}

export async function deleteComment(id: string): Promise<void> {
  await client.data.Comment.delete({ id } as never);
}
