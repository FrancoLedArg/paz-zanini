import { lazy, Suspense, useSyncExternalStore } from "react";

// PROTOTYPE (#7): the 3D gate. Development only (see app/routes.ts); the 3D chunk loads after first paint.
const BookPrototype = lazy(() =>
  import("../book-prototype/book-prototype").then((module) => ({
    default: module.BookPrototype,
  })),
);

const subscribe = () => () => undefined;

export default function DevBook() {
  // WebGL and the browser's media queries exist only on the client.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // Busy from first paint until the view reveals itself, so `pnpm shots` never captures it early.
  const loading = <div aria-busy="true" />;
  if (!mounted) return loading;
  return (
    <Suspense fallback={loading}>
      <BookPrototype />
    </Suspense>
  );
}
