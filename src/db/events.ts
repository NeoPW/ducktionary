/** Tells interested parts of the app (the automatic backup) that the library changed. */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onLibraryChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLibraryChanged(): void {
  for (const listener of listeners) listener();
}
