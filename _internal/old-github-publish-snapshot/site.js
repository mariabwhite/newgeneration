function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  document.body.classList.toggle("light", nextTheme === "light");

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    const isLight = nextTheme === "light";
    themeToggle.textContent = isLight ? "☀" : "☾";
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute(
      "aria-label",
      isLight ? "Включить темную тему" : "Включить светлую тему"
    );
  }

  localStorage.setItem("nge-theme", nextTheme);
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
  setTheme(nextTheme);
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
  const storedTheme = localStorage.getItem("nge-theme");
  if (storedTheme === "light") {
    setTheme("light");
  }

  const storedLang = localStorage.getItem("nge-lang");
  if (storedLang === "en") {
    setLanguage("en");
  } else {
    setLanguage("ru");
  }

  markActiveNav();
});
