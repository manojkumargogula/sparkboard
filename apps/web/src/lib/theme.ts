export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const swap = () => {
    document.documentElement.dataset.theme = theme;
  };
  try {
    localStorage.setItem("sb-theme", theme);
  } catch {
    /* ignore */
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "startViewTransition" in document) document.startViewTransition(swap);
  else swap();
}
