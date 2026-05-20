(function () {
  const STORAGE_KEYS = ["nge-theme", "nge-cabinet-theme"];
  const UNIVERSAL_STORAGE_KEY = "nge-theme-universal";
  const LESSON_STORAGE_KEY = "lesson-palette";
  const PREF_VERSION_KEY = "nge-preferences-version";
  const PREF_VERSION = "20260520-ru-light-default";
  const CATALOG_STORAGE_KEY = "nge-theme-lab";
  const SITE_THEMES = ["dark", "light"];
  const LESSON_THEMES = ["light-lab", "peach", "green", "rose", "cyan", "amber", "white", "black-lab", "violet"];
  const DARK_LESSON_THEMES = new Set(["black-lab", "violet"]);
  const LABELS = { light: "LITE", dark: "DARK" };
  const ARIA = {
    light: "Current theme: light. Switch theme",
    dark: "Current theme: dark. Switch theme",
  };

  function normalizeLessonTheme(theme) {
    const raw = String(theme || "").trim().toLowerCase();
    if (LESSON_THEMES.includes(raw)) return raw;
    if (["dark", "black", "night"].includes(raw)) return "black-lab";
    if (["light", "lite", "day"].includes(raw)) return "light-lab";
    if (["sky", "blue"].includes(raw)) return "cyan";
    return "";
  }

  function siteThemeFromLesson(theme) {
    const lesson = normalizeLessonTheme(theme);
    return DARK_LESSON_THEMES.has(lesson) ? "dark" : "light";
  }

  function normalizeTheme(theme) {
    if (SITE_THEMES.includes(theme)) return theme;
    return siteThemeFromLesson(theme) || "light";
  }

  function readRequestedTheme() {
    try { return normalizeLessonTheme(new URLSearchParams(window.location.search).get("theme")); }
    catch (error) { return ""; }
  }

  function readStorage(key) {
    try { return localStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function readActiveLang() {
    /* URL first: an explicit link must beat stale window.name from the previous page. */
    try {
      const requested = new URLSearchParams(window.location.search).get("lang");
      if (requested === "en" || requested === "ru") return requested;
      const match = String(window.location.href || "").match(/[?&]lang=(en|ru)(?:[&#]|$)/);
      if (match) return match[1];
    } catch (error) {}
    /* window.name survives navigation and keeps file:// pages in one chain. */
    try {
      if (window.name && window.name.charAt(0) === "{") {
        const _st = JSON.parse(window.name);
        if (_st && (_st.lang === "en" || _st.lang === "ru")) return _st.lang;
      }
    } catch (_e) {}
    const stored = readStorage("nge-lang");
    if (stored === "en" || stored === "ru") return stored;
    const htmlLang = document.documentElement.getAttribute("lang");
    return htmlLang === "en" ? "en" : "ru";
  }

  function migrateDefaultPreferences() {
    if (readStorage(PREF_VERSION_KEY) === PREF_VERSION) return;
    try {
      // v20260520: force light + ru defaults (overwrites prior dark/en) on main site.
      // Cabinet keeps its own preference (Maria might prefer cabinet dark).
      localStorage.setItem("nge-lang", "ru");
      localStorage.setItem("nge-theme", "light");
      localStorage.setItem(CATALOG_STORAGE_KEY, "light");
      localStorage.setItem(LESSON_STORAGE_KEY, "light-lab");
      localStorage.setItem(UNIVERSAL_STORAGE_KEY, "light-lab");
      if (!readStorage("nge-cabinet-theme")) localStorage.setItem("nge-cabinet-theme", "dark");
      localStorage.setItem(PREF_VERSION_KEY, PREF_VERSION);
    } catch (error) {}
  }

  function stampPreferences() {
    try { localStorage.setItem(PREF_VERSION_KEY, PREF_VERSION); } catch (error) {}
  }

  function readStoredLessonTheme() {
    const requestedTheme = readRequestedTheme();
    if (requestedTheme) return requestedTheme;
    const candidates = [LESSON_STORAGE_KEY, UNIVERSAL_STORAGE_KEY, CATALOG_STORAGE_KEY, ...STORAGE_KEYS];
    for (const key of candidates) {
      const value = normalizeLessonTheme(readStorage(key));
      if (value) return value;
    }
    return "light-lab";
  }

  function writeStoredTheme(lessonTheme) {
    const lesson = normalizeLessonTheme(lessonTheme) || "black-lab";
    stampPreferences();
    const site = siteThemeFromLesson(lesson);
    try {
      STORAGE_KEYS.forEach((key) => localStorage.setItem(key, site));
      localStorage.setItem(CATALOG_STORAGE_KEY, site);
      localStorage.setItem(LESSON_STORAGE_KEY, lesson);
      localStorage.setItem(UNIVERSAL_STORAGE_KEY, lesson);
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

  function themedHref(href, lessonTheme) {
    if (!href || href === "#" || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return href;
    if (/\.(?:png|jpe?g|webp|gif|svg|pdf|zip)(?:[?#].*)?$/i.test(href)) return href;
    if (/^(?:https?:)?\/\//i.test(href) && !href.includes(window.location.host)) return href;
    const hashIndex = href.indexOf("#");
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
    const body = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const clean = body
      .replace(/([?&])theme=[^&#]*&?/i, "$1")
      .replace(/([?&])lang=[^&#]*&?/i, "$1")
      .replace(/[?&]$/, "");
    const sep = clean.includes("?") ? "&" : "?";
    return `${clean}${sep}theme=${encodeURIComponent(lessonTheme)}&lang=${encodeURIComponent(readActiveLang())}${hash}`;
  }

  function syncLinks(lessonTheme) {
    document.querySelectorAll("a[href]").forEach((link) => {
      link.setAttribute("href", themedHref(link.getAttribute("href"), lessonTheme));
    });
  }

  function setTheme(theme) {
    const lessonTheme = normalizeLessonTheme(theme) || (normalizeTheme(theme) === "light" ? "light-lab" : "black-lab");
    const siteTheme = siteThemeFromLesson(lessonTheme);
    document.documentElement.dataset.theme = siteTheme;
    document.body.classList.toggle("light", siteTheme === "light");
    syncThemeButtons(siteTheme);
    writeStoredTheme(lessonTheme);
    syncLinks(lessonTheme);

    /* Keep URL in sync — survives file:// origin isolation between pages */
    try {
      const _u = new URL(window.location.href);
      _u.searchParams.set("theme", lessonTheme);
      history.replaceState(null, "", _u.toString());
    } catch (_e) {}

    /* window.name — main state bridge. Survives navigation in same tab,
       NOT blocked by file:// origin isolation. */
    try {
      let _st = {};
      try { _st = (window.name && window.name.charAt(0) === "{") ? JSON.parse(window.name) : {}; } catch (_e2) {}
      _st.theme = lessonTheme;
      window.name = JSON.stringify(_st);
    } catch (_e) {}
  }

  function toggleTheme() {
    const current = normalizeTheme(document.documentElement.dataset.theme || siteThemeFromLesson(readStoredLessonTheme()));
    setTheme(current === "light" ? "black-lab" : "light-lab");
  }

  function initThemeCycle() {
    migrateDefaultPreferences();
    setTheme(readStoredLessonTheme());
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
  window.NGETheme = { setTheme, toggleTheme, syncLinks };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initThemeCycle, { once: true });
  else initThemeCycle();
})();

