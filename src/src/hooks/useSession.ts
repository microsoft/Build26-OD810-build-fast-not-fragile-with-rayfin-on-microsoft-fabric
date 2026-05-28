import { useEffect, useState } from 'react';
import { client } from '../client';

export interface SessionState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  ready: boolean;
}

const initial: SessionState = {
  isAuthenticated: false,
  userId: null,
  email: null,
  displayName: null,
  ready: false,
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => snapshot());

  useEffect(() => {
    setState(snapshot());
    const off = client.auth.onSessionChange(() => {
      setState(snapshot());
    });
    return () => {
      try {
        off?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return state;
}

function snapshot(): SessionState {
  try {
    const session = client.auth.getSession() as
      | {
          isAuthenticated?: boolean;
          user?: { id?: string; sub?: string; email?: string; displayName?: string; name?: string };
        }
      | null
      | undefined;
    if (!session?.isAuthenticated || !session.user) {
      return { ...initial, ready: true };
    }
    const user = session.user;
    const userId = user.id ?? user.sub ?? null;
    const email = user.email ?? null;
    const displayName = user.displayName ?? user.name ?? deriveName(email);
    return {
      isAuthenticated: true,
      userId,
      email,
      displayName,
      ready: true,
    };
  } catch {
    return { ...initial, ready: true };
  }
}

function deriveName(email: string | null): string | null {
  if (!email) return null;
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
