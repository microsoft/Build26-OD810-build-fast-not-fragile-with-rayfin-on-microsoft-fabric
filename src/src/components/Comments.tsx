import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import {
  createComment,
  deleteComment,
  listCommentsForRecipe,
  type CommentRow,
} from '../lib/comments';
import type { RecipeView } from '../lib/types';

interface Props {
  recipe: RecipeView;
}

const MAX_LENGTH = 1000;

export default function Comments({ recipe }: Props) {
  const session = useSession();
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComments(null);
    setError(null);
    (async () => {
      try {
        const rows = await listCommentsForRecipe(recipe.id);
        if (!cancelled) setComments(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setComments([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipe.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.userId) return;
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createComment({
        recipeId: recipe.id,
        body: body.slice(0, MAX_LENGTH),
        userId: session.userId,
        userName: session.displayName ?? session.email ?? null,
        recipeVisibility: recipe.visibility,
        recipeUserId: recipe.user_id,
      });
      setComments((prev) => (prev ? [created, ...prev] : [created]));
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this comment?')) return;
    setError(null);
    try {
      await deleteComment(id);
      setComments((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const isOwner = session.userId === recipe.user_id;

  return (
    <section className="comments">
      <h2>Comments</h2>

      {session.isAuthenticated ? (
        <form className="comment-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="visually-hidden">Add a comment</span>
            <textarea
              className="input"
              rows={3}
              placeholder="Share your thoughts on this recipe…"
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <div className="comment-form-actions">
            <span className="muted">{draft.length} / {MAX_LENGTH}</span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || draft.trim().length === 0}
            >
              {busy ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="muted comment-signin">
          <Link to="/login" className="link">Sign in</Link> to post a comment.
        </p>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {!comments && <p className="muted">Loading comments…</p>}

      {comments && comments.length === 0 && (
        <p className="muted">No comments yet.{session.isAuthenticated ? ' Be the first to share your take.' : ''}</p>
      )}

      {comments && comments.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => {
            const canDelete = isOwner || session.userId === c.user_id;
            return (
              <li key={c.id} className="comment">
                <div className="comment-head">
                  <strong className="comment-author">
                    {c.userName ?? 'Unknown chef'}
                  </strong>
                  <time className="comment-date" dateTime={c.createdAt}>
                    {formatRelative(c.createdAt)}
                  </time>
                  {canDelete && (
                    <button
                      type="button"
                      className="link comment-delete"
                      onClick={() => onDelete(c.id)}
                      aria-label="Delete comment"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="comment-body">{c.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(iso).toLocaleDateString();
}
