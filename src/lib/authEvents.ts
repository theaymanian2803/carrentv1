type AuthFailureListener = () => void;

const listeners = new Set<AuthFailureListener>();

/** Subscribe to a 401 with a token attached. Returns an unsubscribe function. */
export function onAuthFailure(listener: AuthFailureListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAuthFailure(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A broken listener must not stop the others.
    }
  }
}
