function setTheme(theme) {
  const themes = ["dark", "light"];
  const nextTheme = themes.includes(theme) ? theme : "dark";
  if (window.NGETheme && typeof window.NGETheme.setTheme === "function") {
    window.NGETheme.setTheme(nextTheme);
    return;
  }
    document.documentElement.dataset.theme = nextTheme;
  document.body.classList.toggle("light", nextTheme === "light");
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    const labels = { light: "LIGHT", dark: "DARK" };
    themeToggle.textContent = labels[nextTheme];
    themeToggle.setAttribute("aria-pressed", String(nextTheme !== "light"));
    themeToggle.setAttribute("aria-label", `Переключить тему: сейчас ${labels[nextTheme]}`);
    themeToggle.dataset.themeCurrent = nextTheme;
  }

  localStorage.setItem("nge-theme", nextTheme);
}

function toggleTheme() {
  if (window.NGETheme && typeof window.NGETheme.toggleTheme === "function") {
    window.NGETheme.toggleTheme();
    return;
  }
  const themes = ["dark", "light"];
  const current = document.documentElement.dataset.theme || (document.body.classList.contains("light") ? "light" : "dark");
  const currentIndex = themes.indexOf(current);
  setTheme(themes[(currentIndex + 1) % themes.length]);
}

function setLanguage(lang) {
  const isEnglish = lang === "en";
  document.body.classList.toggle("en", isEnglish);

  const langButton = document.getElementById("langBtn");
  if (langButton) {
    langButton.textContent = isEnglish ? "EN" : "RU";
  }

  document.querySelectorAll("[data-en]").forEach((element) => {
    const text = isEnglish ? element.dataset.en : element.dataset.ru;
    if (typeof text === "string") {
      element.textContent = text;
    }
  });

  localStorage.setItem("nge-lang", lang);
}

function toggleLang() {
  const nextLang = document.body.classList.contains("en") ? "ru" : "en";
  setLanguage(nextLang);
}

function markActiveNav() {
  const currentPage = document.body.dataset.page;
  if (!currentPage) return;

  document.querySelectorAll(".topnav-link[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === currentPage);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTheme(localStorage.getItem("nge-theme") || "dark");

  const storedLang = localStorage.getItem("nge-lang");
  if (storedLang === "en") {
    setLanguage("en");
  } else {
    setLanguage("ru");
  }

  markActiveNav();
});
