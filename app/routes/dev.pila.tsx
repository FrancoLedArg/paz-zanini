import { lazy, Suspense, useSyncExternalStore } from "react";

// PROTOTYPE (#7): the 3D gate. Development only (see app/routes.ts); the 3D chunk loads after first paint.
const PilaPrototype = lazy(() =>
  import("../book-prototype/book-prototype").then((module) => ({
    default: module.PilaPrototype,
  })),
);

const subscribe = () => () => undefined;

export default function DevPila() {
  // WebGL and the browser's media queries exist only on the client.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return (
    <Suspense>
      <PilaPrototype />
    </Suspense>
  );
}
