/** A CSS custom property of the page, e.g. `cssVar("--ink")`. Lets canvas drawings use the same colors and fonts as the CSS. */
export const cssVar = (name: string) => window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Whether the page is dark: the theme chosen with the toggle, or else the system's. */
export const isDark = () => {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
};
