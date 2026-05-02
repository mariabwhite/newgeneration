(function () {
  const STORAGE_KEYS = ["nge-theme", "nge-cabinet-theme"];
  const THEMES = ["dark", "light"];
  const LABELS = {
    light: "LITE",
    dark: "DARK",
  };
  const ARIA = {
    light: "Current theme: light. Switch theme",
    dark: "Current theme: dark. Switch theme",
  };

  function normalizeTheme(theme) {
    return THEMES.includes(theme) ? theme : "dark";
  }

  function readStoredTheme() {
    const requestedTheme = readRequestedTheme();
    if (requestedTheme) return requestedTheme;

    try {
      for (const key of STORAGE_KEYS) {
        const value = localStorage.getItem(key);
        if (THEMES.includes(value)) return value;
      }
    } catch (error) {
      return "dark";
    }
    return "dark";
  }

  function readRequestedTheme() {
    try {
      const params = new URLSearchParams(window.location.search);
      const theme = params.get("theme");
      return THEMES.includes(theme) ? theme : null;
    } catch (error) {
      return null;
    }
  }

  function writeStoredTheme(theme) {
    try {
      STORAGE_KEYS.forEach((key) => localStorage.setItem(key, theme));
    } catch (error) {
      return;
    }
  }

  function syncThemeButtons(theme) {
    document.querySelectorAll("#theme-toggle, #labThemeToggle, [data-theme-toggle]").forEach((button) => {
      button.textContent = LABELS[theme];
      button.setAttribute("aria-label", ARIA[theme]);
      button.setAttribute("aria-pressed", theme !== "light" ? "true" : "false");
      button.dataset.themeCurrent = theme;
    });
  }

  function setTheme(theme) {
    const nextTheme = normalizeTheme(theme);
    document.documentElement.dataset.theme = nextTheme;
    document.body.classList.toggle("light", nextTheme === "light");
    syncThemeButtons(nextTheme);
    writeStoredTheme(nextTheme);
  }

  function toggleTheme() {
    const current = normalizeTheme(document.documentElement.dataset.theme || readStoredTheme());
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    setTheme(next);
  }

  function initThemeCycle() {
    setTheme(readStoredTheme());
    document.querySelectorAll("#theme-toggle, #labThemeToggle, [data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeCycleBound === "true") return;
      button.dataset.themeCycleBound = "true";
      button.addEventListener("click", (event) => {
        if (button.hasAttribute("onclick")) return;
        event.preventDefault();
        toggleTheme();
      });
    });
  }

  window.setTheme = setTheme;
  window.toggleTheme = toggleTheme;
  window.NGETheme = { setTheme, toggleTheme };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeCycle, { once: true });
  } else {
    initThemeCycle();
  }
})();
