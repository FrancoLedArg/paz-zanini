import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False while rendering the prerendered HTML and hydrating it, true on the client after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
