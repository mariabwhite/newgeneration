(function () {
  const LESSON_STORAGE_KEY = "lesson-palette";
  const CATALOG_STORAGE_KEY = "nge-theme-lab";
  const SITE_STORAGE_KEYS = ["nge-theme", "nge-cabinet-theme"];
  const UNIVERSAL_STORAGE_KEY = "nge-theme-universal";
  const DEFAULT_LESSON_THEME = "light-lab";
  const PREF_VERSION_KEY = "nge-preferences-version";
  const PREF_VERSION = "20260517-light-ru-default";
  const LANG_STORAGE_KEY = "nge-lang";
  const lessonThemes = new Set(["light-lab", "peach", "green", "rose", "cyan", "amber", "white", "black-lab", "violet"]);
  const darkLessonThemes = new Set(["black-lab", "violet"]);
  const fixedDisplayThemes = {
    "body-and-grammar-pink.html": "pink",
    "ancient-china-cultural-studies.html": "china",
    "grammar-arcade-pc-pp.html": "grammar",
    "restaurant-menu-lab.html": "rosegold",
    "space-explorers-english.html": "space",
    "word-building-prefixes-and-suffixes.html": "wordbuilding"
  };

  function readStorage(key) {
    try { return localStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  function migrateDefaultPreferences() {
    if (readStorage(PREF_VERSION_KEY) === PREF_VERSION) return;
    if (!readStorage("nge-lang")) writeStorage("nge-lang", "ru");
    if (!readStorage("nge-theme")) writeStorage("nge-theme", "light");
    if (!readStorage("nge-cabinet-theme")) writeStorage("nge-cabinet-theme", "dark");
    if (!readStorage(CATALOG_STORAGE_KEY)) writeStorage(CATALOG_STORAGE_KEY, "light");
    if (!readStorage(LESSON_STORAGE_KEY)) writeStorage(LESSON_STORAGE_KEY, "light-lab");
    if (!readStorage(UNIVERSAL_STORAGE_KEY)) writeStorage(UNIVERSAL_STORAGE_KEY, "light-lab");
    writeStorage(PREF_VERSION_KEY, PREF_VERSION);
  }

  function stampPreferences() { writeStorage(PREF_VERSION_KEY, PREF_VERSION); }

  function normalizeLang(value) {
    return value === "en" || value === "ru" ? value : "";
  }

  function readQueryLang() {
    try {
      const requested = normalizeLang(new URLSearchParams(window.location.search).get("lang"));
      if (requested) return requested;
      const match = String(window.location.href || "").match(/[?&]lang=(en|ru)(?:[&#]|$)/);
      return match ? match[1] : "";
    } catch (error) { return ""; }
  }

  function resolveLang() {
    return readQueryLang() || normalizeLang(readStorage(LANG_STORAGE_KEY)) || normalizeLang(document.documentElement.getAttribute("lang")) || "ru";
  }

  function writeLang(lang) {
    const next = normalizeLang(lang) || "ru";
    writeStorage(LANG_STORAGE_KEY, next);
    stampPreferences();
    return next;
  }

  function syncLanguageLinks() {
    syncLinks(document, outboundTheme());
  }

  function applyLanguage(lang) {
    const next = writeLang(lang);
    document.documentElement.setAttribute("lang", next);
    if (document.body) document.body.classList.toggle("en", next === "en");
    document.querySelectorAll("[data-ru][data-en]").forEach((element) => {
      const text = element.getAttribute("data-" + next);
      if (text == null) return;
      if (element.getAttribute("data-i18n-mode") === "html") element.innerHTML = text;
      else element.textContent = text;
    });
    document.querySelectorAll("#langBtn, [data-lang-toggle]").forEach((button) => {
      button.textContent = next === "ru" ? "EN" : "RU";
    });
    document.querySelectorAll("[data-lang-btn]").forEach((button) => {
      const buttonLang = normalizeLang(button.getAttribute("data-lang-btn"));
      button.classList.toggle("is-active", buttonLang === next);
    });
    syncLanguageLinks();
    return next;
  }

  function readQueryTheme() {
    try { return new URLSearchParams(window.location.search).get("theme") || ""; } catch (error) { return ""; }
  }

  function normalizeRaw(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (lessonThemes.has(raw)) return raw;
    if (["dark", "black", "night"].includes(raw)) return "black-lab";
    if (["lite", "light", "day"].includes(raw)) return "light-lab";
    if (["sky", "blue"].includes(raw)) return "cyan";
    return "";
  }

  function lessonTheme(value) {
    return normalizeRaw(value) || DEFAULT_LESSON_THEME;
  }

  function siteTheme(value) {
    const raw = normalizeRaw(value);
    return darkLessonThemes.has(raw) ? "dark" : "light";
  }

  function readStoredTheme() {
    return readStorage(LESSON_STORAGE_KEY) || readStorage(UNIVERSAL_STORAGE_KEY) || readStorage(CATALOG_STORAGE_KEY) || readStorage("nge-theme") || readStorage("nge-cabinet-theme") || "";
  }

  function resolveTheme() {
    return lessonTheme(readQueryTheme() || readStoredTheme() || document.documentElement.getAttribute("data-theme") || DEFAULT_LESSON_THEME);
  }

  function fixedDisplayTheme() {
    const file = (window.location.pathname || "").replace(/\\/g, "/").split("/").pop().toLowerCase();
    return fixedDisplayThemes[file] || "";
  }

  function outboundTheme(value) {
    return lessonTheme(value || readQueryTheme() || readStoredTheme() || DEFAULT_LESSON_THEME);
  }

  function writeTheme(theme) {
    const lesson = lessonTheme(theme);
    stampPreferences();
    const site = siteTheme(lesson);
    writeStorage(LESSON_STORAGE_KEY, lesson);
    writeStorage(UNIVERSAL_STORAGE_KEY, lesson);
    writeStorage(CATALOG_STORAGE_KEY, site);
    SITE_STORAGE_KEYS.forEach((key) => writeStorage(key, site));
  }

  function queryThemeFromInternal(value) {
    return lessonTheme(value);
  }

  function withTheme(href, theme) {
    if (!href || href === "#" || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return href;
    if (/\.(?:png|jpe?g|webp|gif|svg|pdf|zip)(?:[?#].*)?$/i.test(href)) return href;
    if (/^(?:https?:)?\/\//i.test(href) && !href.includes(window.location.host)) return href;
    const queryTheme = queryThemeFromInternal(theme);
    const hashIndex = href.indexOf("#");
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
    const body = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const clean = body
      .replace(/([?&])theme=[^&#]*&?/i, "$1")
      .replace(/([?&])lang=[^&#]*&?/i, "$1")
      .replace(/[?&]$/, "");
    const sep = clean.includes("?") ? "&" : "?";
    return `${clean}${sep}theme=${encodeURIComponent(queryTheme)}&lang=${encodeURIComponent(resolveLang())}${hash}`;
  }

  function syncLinks(scope, theme) {
    const root = scope || document;
    const activeTheme = lessonTheme(theme || document.documentElement.getAttribute("data-theme") || readQueryTheme() || readStoredTheme());
    root.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      if (/\.(?:png|jpe?g|webp|gif|svg|pdf|zip)(?:[?#].*)?$/i.test(href)) return;
      link.setAttribute("href", withTheme(href, activeTheme));
    });
  }

  function syncControls(theme) {
    const activeTheme = lessonTheme(theme);
    document.querySelectorAll("[data-palette], .palette-select").forEach((select) => {
      if (select.value !== activeTheme) select.value = activeTheme;
    });
    document.querySelectorAll("[data-theme-toggle], #labThemeToggle, #theme-toggle").forEach((button) => {
      if (!button) return;
      const isDark = darkLessonThemes.has(activeTheme);
      button.dataset.themeCurrent = activeTheme;
      button.setAttribute("aria-pressed", String(isDark));
      if (button.matches("[data-theme-toggle]")) button.textContent = isDark ? "Light" : "Dark";
    });
  }
  function syncHeroAssets(theme) {
    const activeTheme = lessonTheme(theme || document.documentElement.getAttribute("data-theme") || resolveTheme());
    const isDark = darkLessonThemes.has(activeTheme);
    const audience = (document.body && document.body.dataset.audience) || readStorage("lesson-audience") || "kids";
    const key = `${audience}${isDark ? "Dark" : "Light"}`;
    document.querySelectorAll("[data-hero-img]").forEach((image) => {
      const nextSrc = image.dataset[key] || image.getAttribute("data-detached-src") || image.getAttribute("src");
      if (nextSrc && image.getAttribute("src") !== nextSrc) image.setAttribute("src", nextSrc);
    });
  }

  function announceTheme(theme) {
    syncHeroAssets(theme);
    try { window.dispatchEvent(new CustomEvent("linguaboost:theme-applied", { detail: { theme } })); } catch (error) {}
  }
  function applyLessonTheme(value) {
    const requestedTheme = outboundTheme(value || resolveTheme());
    const displayTheme = fixedDisplayTheme() || requestedTheme;
    document.documentElement.setAttribute("data-theme", displayTheme);
    if (document.body) document.body.classList.toggle("light", !darkLessonThemes.has(displayTheme));
    writeTheme(requestedTheme);
    syncControls(requestedTheme);
    syncLinks(document, requestedTheme);
    announceTheme(requestedTheme);
    return displayTheme;
  }

  function applyCatalogTheme(value) {
    const lesson = lessonTheme(value || readQueryTheme() || readStoredTheme() || document.documentElement.getAttribute("data-theme") || DEFAULT_LESSON_THEME);
    const catalog = siteTheme(lesson);
    document.documentElement.setAttribute("data-theme", catalog);
    if (document.body) document.body.classList.toggle("light", catalog === "light");
    writeTheme(lesson);
    syncControls(lesson);
    syncLinks(document, lesson);
    announceTheme(lesson);
    return catalog;
  }

  const api = {
    lessonTheme,
    catalogTheme: siteTheme,
    siteTheme,
    resolveLessonTheme: resolveTheme,
    resolveCatalogTheme() { return siteTheme(resolveTheme()); },
    queryThemeFromInternal,
    withTheme,
    syncLinks,
    writeTheme,
    applyLessonTheme,
    syncHeroAssets,
    applyCatalogTheme
  };

  window.LinguaBoostTheme = api;
  migrateDefaultPreferences();
  const path = window.location.pathname.replace(/\\/g, "/");
  const isCatalog = /\/lingua-boost-lab\/(index\.html)?$/.test(path);
  const isLabPage = /\/lingua-boost-lab\//.test(path);
  if (isCatalog) api.applyCatalogTheme();
  else if (isLabPage) api.applyLessonTheme();

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(resolveLang());
    document.querySelectorAll("#langBtn, [data-lang-toggle]").forEach((button) => {
      if (button.dataset.lbLangSyncBound === "true") return;
      button.dataset.lbLangSyncBound = "true";
      button.addEventListener("click", (event) => {
        if (button.hasAttribute("onclick")) return;
        event.preventDefault();
        const currentLang = normalizeLang(document.documentElement.getAttribute("lang")) || resolveLang();
        applyLanguage(currentLang === "en" ? "ru" : "en");
      });
    });
    document.querySelectorAll("[data-lang-btn]").forEach((button) => {
      if (button.dataset.lbLangSyncBound === "true") return;
      button.dataset.lbLangSyncBound = "true";
      button.addEventListener("click", () => applyLanguage(button.getAttribute("data-lang-btn")));
    });
    const theme = isCatalog ? resolveTheme() : applyLessonTheme();
    const linkTheme = isCatalog ? theme : outboundTheme();
    syncControls(linkTheme);
    syncLinks(document, linkTheme);
    document.querySelectorAll("[data-palette], .palette-select").forEach((select) => {
      if (select.dataset.lbThemeSyncBound === "true") return;
      select.dataset.lbThemeSyncBound = "true";
      select.addEventListener("change", () => {
        applyLessonTheme(select.value);
        syncLinks(document, outboundTheme(select.value));
      });
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      if (button.dataset.lbThemeSyncBound === "true") return;
      button.dataset.lbThemeSyncBound = "true";
      button.addEventListener("click", () => {
        setTimeout(() => syncLinks(document, document.documentElement.getAttribute("data-theme") || resolveTheme()), 0);
      });
    });
    const queryTheme = normalizeRaw(readQueryTheme());
    if (queryTheme) {
      const reapplyQueryTheme = () => {
        if (isCatalog) api.applyCatalogTheme(queryTheme);
        else if (isLabPage) api.applyLessonTheme(queryTheme);
      };
      setTimeout(reapplyQueryTheme, 0);
      setTimeout(reapplyQueryTheme, 120);
      window.addEventListener("load", () => setTimeout(reapplyQueryTheme, 0), { once: true });
    }
  });
})();


