/** Whether the visitor asks for reduced motion, read when called. */
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
