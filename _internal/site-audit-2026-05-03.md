# Технический слепок сайта New Generation English / LinguaBoost Lab
**Дата аудита:** 2026-05-03  
**Корень сайта:** `Продолжаем тут/`  
**Автор аудита:** Claude (Sonnet 4.6), автоматический анализ

---

## ОБЩАЯ АРХИТЕКТУРА

Сайт состоит из двух зон:
- **Основной сайт NGE** — 8 HTML-страниц в корне, тема dark/light через `system.css` + `theme-cycle.js`
- **LinguaBoost Lab** — поддиректория `lingua-boost-lab/`, отдельная дизайн-система с палитрами и аудиторией kids/adults

**Общие JS-файлы:**
- `site.js` (2 513 байт) — `setTheme()`, `toggleTheme()`, `setLanguage()`, `toggleLang()`, `markActiveNav()`; читает/пишет `localStorage: nge-theme, nge-lang`
- `theme-cycle.js` (2 774 байт) — `NGETheme.setTheme()`, `NGETheme.toggleTheme()`; читает/пишет `localStorage: nge-theme, nge-cabinet-theme`

**Общий CSS:**
- `system.css` (19 816 байт) — дизайн-система: CSS-переменные `--bg, --text, --accent (#FF5A1F), --line` и пр.
- `assets/visitor-counter.css` (132 байт) — стили счётчика
- `assets/visitor-counter.js` (911 байт) — счётчик посетителей (инициализирован значением `1243`)

**Топнав (одинаков на всех страницах основного сайта):**
| Ссылка | href | data-nav |
|--------|------|----------|
| О проекте | about-project.html | about |
| Программы | programs.html | programs |
| Кейсы и видео | cases.html | cases |
| Условия | conditions.html | conditions |
| Дневник и блог | blog.html | blog |
| Лаборатория | lingua-boost-lab/index.html | lab |

---

## СТРАНИЦЫ ОСНОВНОГО САЙТА

---

### 1. index.html

**Файл:** `index.html`  
**Тег title:** `New Generation English`  
**`<body data-page>`:** `data-page="home"`  
**CSS-тема по умолчанию:** dark (нет data-theme на html; тема устанавливается через `theme-cycle.js` из `localStorage: nge-theme` → fallback `"dark"`)

**Внешние зависимости:**
- Google Fonts preconnect: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
- Google Fonts: Manrope (400;500;600;700;800), Unbounded (500;700;800;900), JetBrains Mono (400;500;700)

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` — OK (19 816 байт)
- `<script defer src="./site.js">` — OK (2 513 байт)
- `<script defer src="./theme-cycle.js">` — OK (2 774 байт)

**Изображения в hero:**
| Атрибут | Значение | Файл | Размер | Статус |
|---------|----------|------|--------|--------|
| `src` | `assets/maria-hero-premium.jpg` | assets/maria-hero-premium.jpg | 525 035 байт | OK |

Hero-изображение: нет атрибута `data-hero-img`. Изображение в теге `<img src="assets/maria-hero-premium.jpg" alt="Мария Витальевна Бурцева">` с `onerror` fallback.

**Inline JS функции:**
- `toggleTheme()` — делегирует `window.NGETheme.toggleTheme()`
- `toggleLang()` — делегирует глобальному `window.toggleLang`
- Cookie banner: `localStorage.setItem('nge-cookie-ok', '1')` при нажатии «Понятно»; при загрузке читает `localStorage.getItem('nge-cookie-ok')`

**localStorage ключи:**
- `nge-cookie-ok` — флаг принятия кукис (устанавливаетс�� кнопкой баннера)
- `nge-theme` (через site.js / theme-cycle.js)
- `nge-lang` (через site.js)

**Внутренние ссылки на другие страницы:**
- `index.html` (бренд-логотип)
- `about-project.html`, `programs.html`, `cases.html`, `conditions.html`, `blog.html`, `lingua-boost-lab/index.html` (топнав)
- `programs.html` (кнопка «Выбрать формат»)
- `lingua-boost-lab/index.html` (кнопка «LinguaBoost Studio»)
- `cabinet/login.html` (ссылка «открыть кабинет»)
- `conditions.html#organisation` (ссылка в cookie-баннере)
- Telegram: `https://t.me/MariaBurceva_English` (3 ссылки)
- Внешние: VK, YouTube, Дзен, Telegram-группа, MAX, Repetit, Profi, Яндекс, Zoon

**Ключевые data-атрибуты на элементах:**
- Все текстовые узлы имеют `data-ru` / `data-en` для переключения языка
- Топнав-ссылки: `data-nav="about|programs|cases|conditions|blog|lab"`
- Статистика hero: 15+ лет опыта, 500+ учеников, ОГЭ/ЕГЭ, 1:1

---

### 2. conditions.html

**Файл:** `conditions.html`  
**Тег title:** `Условия · New Generation English`  
**`<body data-page>`:** `data-page="conditions"`  
**CSS-тема по умолчанию:** dark (нет data-theme на html; управляется `system.css` + inline CSS)

**Open Graph:** og:title = «Условия · New Generation English», og:image = `https://newgeneration-english.ru/assets/maria-teacher.jpg`  
**Canonical:** `https://newgeneration-english.ru/conditions.html`

**Внешние зависимости:**
- Google Fonts: Manrope, Unbounded, JetBrains Mono (те же веса)

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` — OK
- `<link rel="stylesheet" href="./assets/visitor-counter.css">` — OK
- `<script defer src="./assets/visitor-counter.js">` — OK
- Нет подключения `site.js` и `theme-cycle.js` — тема и язык реализованы полностью **inline**

**Inline JS функции:**
- `toggleTheme()` — переключает `document.body.classList.toggle("light")`, пишет `localStorage: nge-theme`
- `toggleLang()` — переключает `document.documentElement.lang`, обходит `[data-ru]`, пишет `localStorage: nge-lang`
- `markActiveNav()` — помечает активную ссылку по `data-nav`
- `unlockProtectedDocument(btn)` — `prompt()` для пароля → создаёт `<a>` и имитирует скачивание; читает `btn.dataset.doc`
- Авторестор при загрузке: читает `localStorage: nge-theme`, `nge-lang`

**localStorage ключи:**
- `nge-theme`
- `nge-lang`

**Изображения hero:** Нет изображения в hero (только статистика: 1:1, TEST, DOC, PLAN)

**Внутренние ссылки / файлы:**
| Файл | Путь | Существует |
|------|------|-----------|
| Договор | assets/documents/new-generation-service-contract.docx | OK (40 330 байт) |
| Согласие взрослых | assets/documents/personal-data-consent-adult.docx | OK (15 503 байт) |
| Согласие детей | assets/documents/personal-data-consent-child.docx | OK (15 445 байт) |
| Экспертный уровень ЕГЭ 2022 | assets/documents/ege-expert-level-2022.png | OK (1 030 947 байт) |
| ЕГЭ 2024 — 94 балла | assets/documents/ege-2024-94.png | OK (1 170 089 байт) |
| Благодарность Правительства Москвы | assets/documents/gratitude-moscow-2022.jpg | OK (149 241 байт) |
| ЦПМ 2019 | assets/documents/cpm-qualification-2019.png | OK (1 541 488 байт) |
| Просвещение ЕГЭ 2014 | assets/documents/prosveshchenie-ege-2014.png | OK (718 488 байт) |
| Macmillan 2012 | assets/documents/macmillan-conference-2012.png | OK (271 927 байт) |
| Архив 01–20 | assets/documents/teacher-documents/archive-doc-01..20.pdf | Все 20 файлов OK |

**Архивные PDF-файлы (все существуют):**
archive-doc-01.pdf: OK, 02-05: OK, 06: 213 612, 07: 199 962, 08: 198 272, 09: 267 043, 10: 249 842, 11: 182 180, 12: 267 017, 13: 292 851, 14: 156 555, 15: 284 530, 16: 232 223, 17: 268 061, 18: 276 061, 19: 242 891, 20: 350 103 байт

**Критичные data-атрибуты:**
- Кнопка договора: `data-doc="assets/documents/new-generation-service-contract.docx"` + `onclick="unlockProtectedDocument(this)"`
- Архивные кнопки: `data-doc="assets/documents/teacher-documents/archive-doc-NN.pdf"` + тот же `onclick`
- Секции: `id="formats"`, `id="organisation"`, `id="legal"`, `id="documents"`

---

### 3. about-project.html

**Файл:** `about-project.html`  
**Тег title:** `О проекте New Generation English`  
**`<body data-page>`:** `data-page="about"`  
**CSS-тема по умолчанию:** dark (через `theme-cycle.js`)

**Внешние зависимости:**
- Google Fonts: Manrope, Unbounded, JetBrains Mono

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` — OK
- `<link rel="stylesheet" href="./assets/visitor-counter.css">` — OK
- `<script defer src="./site.js">` — OK
- `<script defer src="./theme-cycle.js">` — OK
- `<script defer src="./assets/visitor-counter.js">` — OK (скрипт в конце тела)

**Inline JS функции (в `<head>`):**
- `toggleTheme()` — делегирует `window.NGETheme.toggleTheme()`
- `toggleLang()` — делегирует `window.toggleLang`
- `updateExperienceCounter()` — вычисляет стаж с `new Date(2009, 8, 1)`, обновляет `#expCounter`
- `updateExperienceTicker()` — живой тикер `#expTicker` с обновлением каждую секунду
- `markActiveNav()` — по `data-page` / `data-nav`
- DOMContentLoaded: читает `localStorage: nge-lang`, вызывает `markActiveNav()`, запускает тикеры

**localStorage ключи:**
- `nge-lang` (чтение при загрузке)
- `nge-theme`, `nge-lang` (через site.js / theme-cycle.js)

**Изображения в hero:**
Нет `[data-hero-img]`. Два изображения в hero-фоне (звёздный фон):
| src | Файл | Размер | Статус |
|-----|------|--------|--------|
| `assets/2b6113f9-60e3-4068-8396-cc913336484c.png` | тёмная версия фона | 1 263 283 байт | OK |
| `assets/b7902a11-3511-4d56-ab78-1ba0c1b8a42b.png` | светлая версия фона | 1 053 545 байт | OK |

Изображение преподавателя в секции 01:
| src | Файл | Размер | Статус |
|-----|------|--------|--------|
| `assets/maria-teacher.jpg` | фото преподавателя | 110 304 байт | OK |

**Внутренние ссылки:**
- `cabinet/student.html`, `cabinet/parent.html`, `cabinet/teacher.html` (eco-кнопки) — все файлы существуют
- `index.html`, `programs.html`, `about-project.html` (кнопки и ссылки hero)
- `conditions.html#documents` (кнопка «Документы и сертификаты»)
- Telegram: `https://t.me/MariaBurceva_English`

**Критичные data-атрибуты:**
- `#expCounter` — динамический счётчик лет опыта
- `#expTicker` — живой тикер формата «СТАЖ: 16y 08m 02d HH:MM:SS»

---

### 4. programs.html

**Файл:** `programs.html`  
**Тег title:** `Программы · New Generation English`  
**`<body data-page>`:** `data-page="programs"`  
**CSS-тема по умолчанию:** dark (через `theme-cycle.js`)

**Внешние зависимости:**
- Google Fonts: Manrope, Unbounded, JetBrains Mono

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` — OK
- `<link rel="stylesheet" href="./assets/visitor-counter.css">` — OK
- `<script defer src="./assets/visitor-counter.js">` — OK
- `<script defer src="./site.js">` — OK
- `<script defer src="./theme-cycle.js">` — OK

**Изображения в hero (декоративный фон):**
| src | Класс | Файл | Размер | Статус |
|-----|-------|------|--------|--------|
| `assets/programs-hero-dashboard-dark.png` | hero-bg-dark | programs-hero-dashboard-dark.png | 1 490 277 байт | OK |
| `assets/programs-hero-dashboard-light.png` | hero-bg-light | programs-hero-dashboard-light.png | 1 202 929 байт | OK |

Изображения используются дважды (edge и base слои). `.hero-media` скрыт через `display: none !important` для страницы programs.

**Inline JS функции:**
- `toggleTheme()`, `toggleLang()`, `markActiveNav()` — делегирующие обёртки
- `initProgramFlips()` — инициализирует 3D-flip карточки программ (`.flip-card`)
- DOMContentLoaded: `markActiveNav()` + `initProgramFlips()`

**localStorage ключи:**
- `nge-theme`, `nge-lang` (через site.js / theme-cycle.js)

**Внутренние ссылки:**
- `#tracks` (якорь на раздел программ)
- `conditions.html` (кнопка «Условия работы»)
- `programs.html` (самоссылка в hero-students-link)
- Telegram: `https://t.me/MariaBurceva_English`

**Программы (6 тайлов `p-tile`):**
1. ОГЭ / ЕГЭ (`.is-main .t-exam`) — основная
2. IELTS / TOEFL (`.is-main .t-int`) — основная
3. Английский для взрослых (`.t-adult`)
4. Разговорный клуб (`.t-club`) — **скрыт: `display: none`**
5. Медицинский английский (`.t-med`)
6. Бизнес-английский (`.t-biz`)

---

### 5. cases.html

**Файл:** `cases.html`  
**Тег title:** `Кейсы и видео · New Generation English`  
**`<body data-page>`:** `data-page="cases"`  
**CSS-тема по умолчанию:** dark (через `theme-cycle.js`)

**Внешние зависимости:**
- Google Fonts: Manrope, Unbounded, JetBrains Mono

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` (строка 1598) — OK
- `<link rel="stylesheet" href="./assets/visitor-counter.css">` — OK
- `<script defer src="./site.js">` (строка 12, в head) — OK
- `<script defer src="./theme-cycle.js">` (строка 13, в head) — OK
- `<script defer src="./assets/visitor-counter.js">` — OK

Примечание: cases.html не имеет inline функций. Весь JS вынесен в `site.js` и `theme-cycle.js`. Контент кейсов генерируется динамически через JS (массивы данных внутри `<script>` в теле страницы).

**Изображения в hero:**
| src | alt | Файл | Размер | Статус |
|-----|-----|------|--------|--------|
| `assets/maria-cases-sidebar.jpg` | New Generation English cases | maria-cases-sidebar.jpg | 50 293 байт | ⚠️ ПУСТЫШКА (< 100KB) |

Это же изображение используется повторно в `.teacher-photo` сайдбара.

**localStorage ключи:**
- `nge-theme`, `nge-lang` (через site.js / theme-cycle.js)

**Внутренние ссылки:**
- `programs.html`, `cases.html` (самоссылка), `conditions.html`, `about-project.html`, `blog.html`, `lingua-boost-lab/index.html` (топнав)
- Telegram: `https://t.me/MariaBurceva_English`

**Hero stats:** ОГЭ, 5 результатов, VK, VIDEO

---

### 6. blog.html

**Файл:** `blog.html`  
**Тег title:** `Дневник и блог — New Generation English`  
**`<body data-page>`:** `data-page="blog"`  
**CSS-тема по умолчанию:** dark (через `theme-cycle.js`)

**Open Graph:** og:title = «Дневник и блог · New Generation English», og:image = `https://newgeneration-english.ru/assets/maria-hero-premium.jpg`  
**Canonical:** `https://newgeneration-english.ru/blog.html`

**Внешние зависимости:**
- Google Fonts: Manrope, Unbounded, JetBrains Mono

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` — OK
- `<link rel="stylesheet" href="./assets/visitor-counter.css">` — OK
- Нет явного `<script src>` для site.js / theme-cycle.js в найденных первых строках (JS встроен inline или подключён в конце тела — требует отдельно�� проверки)

**Изображения в hero:** Изображение в hero не используется (нет `.hero-media` с img в hero-grid). Hero только с текстом.

**Hero stats:** 6 рубрик, AI, ROAD, TEXT

**Разделы (subnav):**
1. `#zen-channel` — Дзен · английский
2. `#travel` — Путешествия
3. `#neural-tools` — Нейронки
4. `#my-path` — Мой путь
5. `#authorship` — Авторство
6. `#dynasty` — Педагогическая династия

**Изображения в теле страницы:**
| Файл | alt | Размер | Статус |
|------|-----|--------|--------|
| `assets/first-html-page-screenshot.png` | Скриншот первой HTML-страницы | 160 940 байт | OK |
| `assets/dynasty/literacy-school-1930s.jpg` | Елена Филаретовна Духина | 526 667 байт | OK |
| `assets/dynasty/dukhiny-family-early.jpg` | Семейная фотография Наркевичей | 1 146 728 байт | OK |
| `assets/dynasty/elena-narkevich-and-ivan-portraits.jpg` | Портреты Елены Наркевич и Ивана Духина | 1 073 997 байт | OK |
| `assets/dynasty/dukhiny-family-1909.jpg` | Семейная фотография Духиных 1909 | 877 613 байт | OK |
| `assets/dynasty/school-archive-lesson.jpg` | Архивная фотография урока | 3 706 077 байт | OK |
| `assets/danilovy/valentina-tarusa.jpg` | Данилова Валентина Алексеевна | 297 849 байт | OK |
| `assets/danilovy/elizaveta-family.jpg` | Данилова Елизавета Ивановна | 163 615 байт | OK |
| `assets/danilovy/bologoe-postcard.jpg` | Старинная открытка «Собор в селе Бологое» | 226 757 байт | OK |
| `assets/danilovy/alexey-elizaveta.jpg` | Алексей и Елизавета Даниловы | 76 416 байт | OK |
| `assets/danilovy/danilov-military.jpg` | Военная фотография из семейного альбома | 37 470 байт | OK |

**Внутренние ссылки:**
- `lingua-boost-lab/index.html`, `cases.html`, `blog.html` (самоссылка), `blog.html#travel`
- Яндекс Дзен: `https://dzen.ru/newgenerationenglish`

---

### 7. travel.html

**Файл:** `travel.html`  
**Тег title:** `Путешествия · New Generation English`  
**`<body data-page>`:** `data-page="travel"`  
**CSS-тема по умолчанию:** dark (через `theme-cycle.js`)

**Open Graph:** og:image = `https://newgeneration-english.ru/assets/maria-hero-premium.jpg`  
**Canonical:** `https://newgeneration-english.ru/travel.html`

**Внешние зависимости:**
- Google Fonts: Manrope, Unbounded, JetBrains Mono

**Внутренние CSS/JS:**
- `<link rel="stylesheet" href="./system.css">` — OK
- `<link rel="stylesheet" href="./assets/visitor-counter.css">` — OK
- `<script defer src="./assets/visitor-counter.js">` — OK
- `<script defer src="./site.js">` — OK
- `<script defer src="./theme-cycle.js">` — OK

**Изображения в hero:**
| src | alt | Файл | Размер | Статус |
|-----|-----|------|--------|--------|
| `assets/maria-hero-premium.jpg` | New Generation English travel | maria-hero-premium.jpg | 525 035 байт | OK |

**Inline JS функции:** Нет (только делегирующий `toggleTheme()` и `toggleLang()` через кнопки в топбаре, они вызывают глобальные функции из подключённых скриптов)

**localStorage ключи:**
- `nge-theme`, `nge-lang` (через site.js / theme-cycle.js)

**Внутренние ссылки:**
- `lingua-boost-lab/index.html`, `blog.html`, `blog.html#travel`
- Telegram: `https://t.me/MariaBurceva_English`

**Разделы страницы:** `#situations`, `#notes`, `#culture`

---

### 8. diagnostic-test.html

**Файл:** `diagnostic-test.html`  
**Тег title:** `New Generation English · Diagnostic Test`  
**`<body data-page>`:** нет атрибута `data-page` на body  
**CSS-тема по умолчанию:** светлая (фиксирована в `<body>` — фон `#f7f5ff`)

Примечание: страница имеет собственную полностью автономную дизайн-систему, не использует `system.css`, `site.js` или `theme-cycle.js`. Отдельные переменные `--accent: #ff9b2f` (оранжевый), `--brand: #7a5fcf` (пурпурный).

**`<meta name="robots">`: `noindex,nofollow`** — страница исключена из индексации

**Внешние зависимости:**
- Google Fonts: Inter, Manrope, JetBrains Mono (через CSS `@import` или подключение)

**Внутренние CSS/JS:**
- Всё инлайн — нет внешних .css или .js файлов
- PDF-ссылки генерируются динамически JS: `pdfPath(level, skill)` → путь типа `assets/diagnostic-pdf/...`

**Inline JS функции (большой блок, ~3 500 строк):**
- Полная тест-система A1–C2 по 5 навыкам (Reading, Listening, Writing, Speaking, Grammatical Range & Accuracy)
- Переключение языка: `data-ru-text` / `data-en-text` (отличается от основной системы `data-ru`/`data-en`)
- Топнав с кнопками CEFR-уровней (A1, A2, B1, B2, C1, C2) генерируется JS
- Генерация PDF-ссылок: `href="${pdfPath(level, skill)}"` — ведут на динамические пути

**localStorage ключи:** Не используется (0 обращений к localStorage)

**Навигация:**
- Бренд → `index.html` (ссылка на ��лавную)
- Кнопка «К условиям работы» → `conditions.html`

---

## LINGUA BOOST LAB

---

### 9. lingua-boost-lab/index.html

**Файл:** `lingua-boost-lab/index.html`  
**Тег title:** `LinguaBoost Studio | Библиотека модулей`  
**`data-theme` на `<html>`:** `data-theme="dark"` (по умолчанию)  
**`<body data-page>`:** нет (файл обрезан — см. ниже)

**КРИТИЧЕСКАЯ ПРОБЛЕМА:**  
Файл обрезан на 80 886 байтах — отсутствуют теги `</style>`, `</head>`, `<body>`, `</html>`. Браузер отображает эту страницу только благодаря error recovery HTML-парсера. Три backup-файла содержат полную версию:
- `index.html.bak-20260502-level-nav` — 81 254 байт, есть `<body>` ✓
- `index.html.bak-20260502-progress-v1` — 92 391 байт, есть `<body>` ✓
- `index.html.bak-before-mojibake-fix` — 97 831 байт, есть `<body>` ✓

**Внешние зависимости:**
- Google Fonts preconnect: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
- Google Fonts: Unbounded (700;800;900), Manrope (400;500;700;800), JetBrains Mono (400;700)

**Внутренние CSS/JS (в head):**
- `<link rel="icon" href="../assets/linguaboost-lab-favicon.svg">` — **MISSING** (файл не существует)
- Нет внешних JS-файлов (судя по доступной части файла)

**CSS-переменные (собственная система «Midnight Plum»):**
- Dark: `--bg: #0e0a18`, `--accent: #ff9b2f` (оранжевый), `--plum: #9a7ad9`, `--success: #2ee59d`
- Light (`data-theme="light"`): `--bg: #f7f5ff`, `--accent: #ff5a1f`, `--plum: #7a5fcf`

**Внутренние assets (в директории `lingua-boost-lab/assets/`):**
| Файл | Размер | Статус |
|------|--------|--------|
| linguaboost-lab-favicon.svg | — | ⚠️ MISSING |
| linguaboost-drop-orange.svg | 1 594 байт | OK |
| linguaboost-drop-purple.svg | 1 571 байт | OK |
| linguaboost-logo-dark-lockup.png | 230 318 байт | OK |
| linguaboost-logo-light-lockup-purple.png | 125 422 байт | OK |
| linguaboost-logo-light-lockup.png | 183 002 байт | OK |
| lab-manifest.js | 4 334 байт | OK |
| studio-badge.css | 1 621 байт | OK |
| studio-module-patch.css | 10 477 байт | OK |
| studio-module-shell.js | 14 772 байт | OK |

**localStorage ключи (из backup/полных версий):**
- `linguaboost.lab.progress.v1` — прогресс по модулям (JSON)
- `nge-theme` / `nge-cabinet-theme` (через NGETheme)

---

### 10. lingua-boost-lab/a1/a1-01-present-simple-routines.html

**Файл:** `lingua-boost-lab/a1/a1-01-present-simple-routines.html`  
**Тег title:** `Present Simple Routines · A1 · LinguaBoost Lab`  
**`data-theme` на `<html>`:** `data-theme="light-lab"` (по умолчанию)  
**`data-page` на body:** нет; `data-audience` устанавливаетс�� JS: `localStorage.getItem("lesson-audience") || "kids"`

**Внешние зависимости:**
- Google Fonts: Unbounded, Manrope, JetBrains Mono

**Внутренние CSS:** Всё инлайн (единый большой `<style>` блок)  
**Внутренние JS:** Всё инлайн

**Доступные темы (data-theme):**
`light-lab`, `peach`, `green`, `rose`, `cyan`, `amber`, `white`, `black-lab`, `violet`

**Изображения:**
| src | Файл | Размер | Статус |
|-----|------|--------|--------|
| `../assets/a1-routines-hero-kids-light.png` | lingua-boost-lab/assets/ | 1 822 142 байт | OK |
| `../assets/a1-story-kids-light-01-get-up.png` | lingua-boost-lab/assets/ | 1 771 779 байт | OK |
| `../assets/a1-story-kids-light-02-breakfast.png` | lingua-boost-lab/assets/ | 1 766 065 байт | OK |
| `../assets/a1-story-kids-light-03-school.png` | lingua-boost-lab/assets/ | 1 992 296 байт | OK |
| `../assets/a1-story-kids-light-04-plan.png` | lingua-boost-lab/assets/ | 1 948 929 байт | OK |

**localStorage ключи:**
- `lesson-palette` — текущая палитра темы
- `nge-lang` (?) — язык (через `langKey`)
- `lab-progress` / прогресс по урокам
- `lesson-audience` — `"kids"` или `"adults"`

Детали ключей из JS:
- `paletteKey` → `localStorage.setItem(paletteKey, ...)` при смене палитры
- `langKey` → язык урока (EN по умолчанию)
- `labProgressKey` → JSON-объект прогресса
- `"lesson-audience"` → явная строка

**Inline JS функции:**
- `applyPalette(palette)` — применяет data-theme на `<html>`
- `applyLang(lang)` — переключает тексты по `data-kids`/`data-adults`
- `updateLessonScore()` — считает правильные ответы
- `applyAudience(audience)` — переключает between kids/adults контент
- `updateHeroImage()`, `updateStoryImages()` — меняют src картинок под аудиторию
- Слушатели событий: `.vocab-card` (flip), `.choice` (выбор варианта), `.practice-hint` (показ подсказки)

**Навигационные ссылки:**
- `../index.html` — назад в LinguaBoost Studio
- `../index.html#a1` — назад в раздел A1
- `./a1-02-present-simple-questions-negatives.html` — следующий урок

---

### 11. lingua-boost-lab/a1/a1-02-present-simple-questions-negatives.html

**Файл:** `lingua-boost-lab/a1/a1-02-present-simple-questions-negatives.html`  
**Тег title:** `Present Simple Questions & Negatives · A1 · LinguaBoost Lab`  
**`data-theme` на `<html>`:** `data-theme="light-lab"`  
**`data-audience`:** JS → `localStorage.getItem("lesson-audience") || "kids"`

**Внешние зависимости:** Google Fonts (те же)

**Изображения:**
| src | Файл | Размер | Статус |
|-----|------|--------|--------|
| `../../assets/ef84992f-9880-480a-89b3-dc9f44c9578c.png` | assets/ (корень сайта) | 2 130 608 байт | OK |

Примечание: путь `../../assets/` из `lingua-boost-lab/a1/` ведёт в корневой `assets/`.

**localStorage ключи:** `lesson-audience`

**Навигационные ссылки:**
- `../index.html`, `../index.html#a1`
- `a1-03-present-simple-adverbs-frequency.html` — следующий урок

---

### 12. lingua-boost-lab/a1/a1-03-present-simple-adverbs-frequency.html

**Файл:** `lingua-boost-lab/a1/a1-03-present-simple-adverbs-frequency.html`  
**Тег title:** `There is / There are · A1 · LinguaBoost Lab`

**ВНИМАНИЕ:** Имя файла (`adverbs-frequency`) **не совпадает** с содержимым (`There is / There are`). Тема урока — конструкция There is/There are, а не наречия частотности.

**`data-theme` на `<html>`:** `data-theme="light-lab"`

**Изображения:**
| src | Файл | Размер | Статус |
|-----|------|--------|--------|
| `../assets/a1-03-hero-kids-light.png` | lingua-boost-lab/assets/ | 1 887 429 байт | OK |
| `../assets/ДЛЯ УРОКОВ/a1-03-room-kids-light.png` | lingua-boost-lab/assets/ДЛЯ УРОКОВ/ | 1 667 317 байт | OK |

**localStorage ключи:** `lesson-audience`

**Навигационные ссылки:**
- `../index.html`, `../index.html#a1`
- `a1-02-present-simple-questions-negatives.html` (назад)
- `a1-04-have-has-my-things.html` (вперёд)

---

### 13. lingua-boost-lab/a1/a1-04-have-has-my-things.html

**Файл:** `lingua-boost-lab/a1/a1-04-have-has-my-things.html`  
**Тег title:** `Have / Has · A1 · LinguaBoost Lab`  
**`data-theme` на `<html>`:** `data-theme="light-lab"`

**Изображения (все из `../assets/ДЛЯ УРОКОВ/`):**
| Файл | Размер | Статус |
|------|--------|--------|
| `a1-04-header-kids-light.png` | 1 979 054 байт | OK |
| `a1-04-kids-scene-01-bag.png` | 27 824 байт | OK |
| `a1-04-kids-scene-02-desk.png` | 28 645 байт | OK |
| `a1-04-kids-scene-03-room.png` | 29 097 байт | OK |
| `a1-04-kids-scene-04-toys.png` | 28 406 байт | OK |
| `a1-04-adults-scene-01-workspace.png` | 26 690 байт | OK |
| `a1-04-adults-scene-02-tools.png` | 27 158 байт | OK |
| `a1-04-adults-scene-03-apartment.png` | 30 609 байт | OK |
| `a1-04-adults-scene-04-bag.png` | 27 263 байт | OK |
| `a1-04-picture-choice-01.png` | 1 668 503 байт | OK |
| `a1-04-picture-choice-02.png` | 1 882 010 байт | OK |
| `a1-04-picture-choice-03.png` | 1 910 304 байт | OK |

**localStorage ключи:** `lesson-palette`, `lesson-audience`

**Навигационные ссылки:**
- `../index.html`, `../index.html#a1`
- `a1-03-present-simple-adverbs-frequency.html` (назад)

---

## СВОДНАЯ ТАБЛИЦА ПРОБЛЕМ

| Приоритет | Файл | Проблема |
|-----------|------|----------|
| 🔴 КРИТИЧНО | `lingua-boost-lab/index.html` | Файл ОБРЕЗАН — нет `</style>`, `<body>`, `</html>`. Страница работает только благодаря HTML error recovery браузера. Backup-версии существуют. |
| 🔴 КРИТИЧНО | `lingua-boost-lab/assets/linguaboost-lab-favicon.svg` | Файл ОТСУТСТВУЕТ. Иконка лаборатории не загружается. |
| 🟡 ВНИМАНИЕ | `assets/maria-cases-sidebar.jpg` | Размер 50 293 байт — меньше 100 KB. Вероятно placeholder или сильно сжатое изображение. Визуально может выглядеть плохо на retina-экранах. |
| 🟡 ВНИМАНИЕ | `lingua-boost-lab/a1/a1-03-present-simple-adverbs-frequency.html` | Имя файла говорит «adverbs-frequency», а `<title>` — «There is / There are». Несоответствие имени и содержимого. |
| 🟡 ВНИМАНИЕ | `conditions.html` | Не подключает `site.js` и `theme-cycle.js` — тема и язык реализованы inline дублирующим кодом. При изменении логики в site.js нужно синхронно обновлять и conditions.html. |
| 🟡 ВНИМАНИЕ | `index.html` | Inline JS содержит синтаксическую ошибку: `} catch (e) {}` и `})();` без соответствующ��го открытия — код в обёртке `toggleLang` некорректно структурирован. |
| ℹ️ ИНФО | `assets/visitor-counter.css` | Только 132 байта — очень маленький файл, возможно stub. |
| ℹ️ ИНФО | `diagnostic-test.html` | Нет `data-page` на body, не использует систему `nge-theme`/`nge-lang`, не подключает `system.css`. Полностью автономная страница. |
| ℹ️ ИНФО | `programs.html` | Тайл «Разговорный клуб» скрыт через `display: none`. |
| ℹ️ ИНФО | `about-project.html` | Изображения фона hero имеют UUID-имена (2b6113f9..., b7902a11...) — трудно идентифицировать по имени. |

---

## КАРТА localStorage КЛЮЧЕЙ

| Ключ | Где пишется | Что ��ранит |
|------|-------------|-----------|
| `nge-theme` | site.js, theme-cycle.js, conditions.html (inline) | `"dark"` или `"light"` |
| `nge-cabinet-theme` | theme-cycle.js | то же (для кабинетов) |
| `nge-lang` | site.js, conditions.html (inline) | `"ru"` или `"en"` |
| `nge-cookie-ok` | index.html (inline cookie banner) | `"1"` — кукис приняты |
| `lesson-palette` | a1-01, a1-04 (inline) | название темы (`"light-lab"`, `"peach"`, …) |
| `lesson-audience` | a1-01, a1-02, a1-03, a1-04 (inline) | `"kids"` или `"adults"` |
| `linguaboost.lab.progress.v1` | lingua-boost-lab/index.html (из bak) | JSON: прогресс по модулям |

---

## СТРУКТУРА ДИРЕКТОРИЙ (краткая)

```
Продолжаем тут/
├── index.html                     ← Главная
├── about-project.html
├── programs.html
├── cases.html
├── conditions.html
├── blog.html
├── travel.html
├── diagnostic-test.html
├── system.css
├── site.js
├── theme-cycle.js
├── assets/
│   ├── maria-hero-premium.jpg     525KB ✓
│   ├── maria-teacher.jpg          110KB ✓
│   ├── maria-cases-sidebar.jpg    50KB  ⚠️
│   ├── programs-hero-dashboard-dark.png  1.4MB ✓
│   ├── programs-hero-dashboard-light.png 1.1MB ✓
│   ├── 2b6113f9-...png            1.2MB ✓  (about hero dark bg)
│   ├── b7902a11-...png            1.0MB ✓  (about hero light bg)
│   ├── ef84992f-...png            2.0MB ✓  (a1-02 lesson image)
│   ├── first-html-page-screenshot.png  160KB ✓
│   ├── visitor-counter.css / .js
│   ├── documents/
│   │   ├── ege-expert-level-2022.png  ✓
│   │   ├── ege-2024-94.png  ✓
│   │   ├── gratitude-moscow-2022.jpg  ✓
│   │   ├── cpm-qualification-2019.png  ✓
│   │   ├── prosveshchenie-ege-2014.png  ✓
│   │   ├── macmillan-conference-2012.png  ✓
│   │   ├── new-generation-service-contract.docx  ✓
│   │   ├── personal-data-consent-adult.docx  ✓
│   │   ├── personal-data-consent-child.docx  ✓
│   │   └── teacher-documents/
│   │       └── archive-doc-01..20.pdf  все 20 файлов ✓
│   ├── dynasty/  (5 фото)  все ✓
│   └── danilovy/  (5 фото)  все ✓
├── cabinet/
│   ├── login.html  ✓
│   ├── student.html  ✓
│   ├── parent.html  ✓
│   └── teacher.html  ✓
├── lingua-boost-lab/
│   ├── index.html  ⚠️ ОБРЕЗАН (нет body)
│   ├── index.html.bak-20260502-level-nav  ✓ (81KB, полный)
│   ├── index.html.bak-20260502-progress-v1  ✓ (92KB, полный)
│   ├── index.html.bak-before-mojibake-fix  ✓ (97KB, полный)
│   ├── assets/
│   │   ├── linguaboost-lab-favicon.svg  ⚠️ MISSING
│   │   ├── linguaboost-drop-orange.svg  ✓
│   │   ├── linguaboost-drop-purple.svg  ✓
│   │   ├── linguaboost-logo-*.png  все ✓
│   │   ├── lab-manifest.js  ✓
│   │   ├── studio-*.css / *.js  ✓
│   │   ├── a1-*.png (story/hero images)  все ✓
│   │   └── ДЛЯ УРОКОВ/ (27 файлов)  все ✓
│   ├── a1/
│   │   ├── a1-01-present-simple-routines.html  ✓
│   │   ├── a1-02-present-simple-questions-negatives.html  ✓
│   │   ├── a1-03-present-simple-adverbs-frequency.html  ✓ ⚠️ несоответствие имени/контента
│   │   ├── a1-04-have-has-my-things.html  ✓
│   │   └── [доп. файлы: easter, past-simple, prepositions, school-words]
│   ├── a2/  (2 модуля)
│   ├── b1/  (4 модуля)
│   ├── b2-plus/  (1 модуль)
│   └── pre-a1/  (1 модуль)
└── _internal/  (служебные файлы, не публичные)
```

---

*Аудит завершён 2026-05-03. Проверено 13 HTML-страниц, все указанные файлы активов, все документы.*
