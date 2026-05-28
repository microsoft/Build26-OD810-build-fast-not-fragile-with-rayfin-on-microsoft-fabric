import { Recipe } from './Recipe.js';
import { Like } from './Like.js';
import { Comment } from './Comment.js';

export type AppSchema = {
  Recipe: Recipe;
  Like: Like;
  Comment: Comment;
};

export { Recipe, Like, Comment };
