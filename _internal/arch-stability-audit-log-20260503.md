# Лог архитектурного аудита стабильности
**Дата:** 2026-05-03  
**Аудитор:** Claude (Cowork)  
**Папка:** `C:\Users\Whitenois\Documents\Claude\Projects\My web site\Продолжаем тут`

---

## ФАЗА 1 — ИНВЕНТАРИЗАЦИЯ И КАРТА АРХИТЕКТУРЫ

### Файловая структура (активные файлы)

**Публичное ядро:**
- `index.html` — главная страница (`data-page="home"`)
- `about-project.html` — о проекте (`data-page="about"`)
- `programs.html` — программы (`data-page="programs"`)
- `cases.html` — кейсы и видео (`data-page="cases"`)
- `conditions.html` — условия (`data-page="conditions"`)
- `blog.html` — блог (`data-page="blog"`)
- `travel.html` — путешествия (`data-page="travel"`)
- `diagnostic-test.html` — диагностический тест (самодостаточный)

**LinguaBoost Lab:**
- `lingua-boost-lab/index.html` — каталог лаборатории
- `lingua-boost-lab/a1/` — 8 уроков (4 новых серийных + 4 старых тематических)
- `lingua-boost-lab/a2/`, `b1/`, `b2-plus/`, `pre-a1/` — уроки по уровням
- `lingua-boost-lab/assets/studio-module-shell.js` — оболочка уроков
- `lingua-boost-lab/assets/studio-badge.css`, `studio-module-patch.css` — стили уроков

**Кабинеты:**
- `cabinet/index.html` — лендинг выбора роли
- `cabinet/login.html` — авторизация
- `cabinet/student.html`, `teacher.html`, `parent.html` — кабинеты
- `cabinet/cabinet.css` — стили кабинетов
- `cabinet/app.js`, `core.js`, `student.js`, `teacher.js`, `parent.js` — логика
- `cabinet/*.standalone.js` — самодостаточные бандлы на каждый кабинет

**Общие ресурсы:**
- `system.css` — единый источник токенов, топбара, кнопок, карточек, типографики
- `site.js` — тема, язык, активный пункт навигации
- `theme-cycle.js` — канонический цикл тем (читает `nge-theme` + `nge-cabinet-theme`)
- `assets/visitor-counter.js / .css` — счётчик посещений

---

### Карта CSS-зависимостей

| Страница | Порядок подключения CSS |
|----------|------------------------|
| index, about, programs, blog, travel | `Google Fonts` → `system.css` → `visitor-counter.css` → `<style>` (локальный) |
| cases | `Google Fonts` → `system.css` → `visitor-counter.css` → `<style>` (после фикса) |
| conditions | `Google Fonts` → `system.css` → `visitor-counter.css` → `<style>` (локальный) |
| diagnostic-test | Полностью самодостаточен, `system.css` не грузит |
| lab/index | Полностью самодостаточен, своя дизайн-система «Midnight Plum» |
| lab/lessons (new a1-01..04) | Полностью самодостаточны, своя тема |
| lab/lessons (old) | `<style>` + `studio-module-shell.js` |
| cabinet/*.html | `system.css` → `cabinet.css` |

### Карта JS-зависимостей

| Страница | JS |
|----------|-----|
| index, about, programs, cases, conditions, blog, travel | `site.js` + `theme-cycle.js` + `visitor-counter.js` + inline-делегат |
| diagnostic-test | Встроенный полностью, нет внешних скриптов |
| lab/index | Встроенный `applyLabTheme()` + `studio-module-shell.js` |
| lab/lessons (new) | Встроенный полностью |
| lab/lessons (old) | `studio-module-shell.js` |
| cabinet | `app.js` + `*.standalone.js` + встроенный theme bootstrap |

### Карта тем

| Модуль | Механизм | localStorage | Кнопка |
|--------|----------|-------------|--------|
| Публичный сайт | `theme-cycle.js` / `site.js` | `nge-theme` | `#theme-toggle` |
| Lab/index | `applyLabTheme()` встроенный | `nge-theme` | `#labThemeToggle` |
| Lab/lessons (old) | `studio-module-shell.js` | `nge-linguaboost-lang` | lang toggle |
| Lab/lessons (new a1-01..04) | Свои встроенные темы (light-lab, peach, green…) | нет | нет |
| Cabinet | `app.js` → `bootThemeAndLang()` | `nge-cabinet-theme` | `#theme-toggle` |
| theme-cycle.js | читает оба ключа (`nge-theme` + `nge-cabinet-theme`) | пишет в оба | — |

---

## ФАЗА 2 — ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### КРИТИЧЕСКИЕ (всего 9 усечённых файлов)

Сайт пережил массовое усечение файлов — скорее всего, при прерванной операции записи. У 9 HTML-файлов отсутствовали `</body>` и `</html>`, что делало страницы неработоспособными:

| Файл | Состояние | Дополнительно |
|------|-----------|---------------|
| `lingua-boost-lab/index.html` | Усечён посередине CSS, нет body вообще | 81 KB только CSS |
| `index.html` | Усечён в footer, нет JS, `</body>`, `</html>` | Кнопки темы/языка не работали |
| `cases.html` | Усечён в footer | system.css был в конце файла (FOUC) |
| `conditions.html` | Усечён + null-байты в конце | Старый inline toggleTheme() |
| `blog.html` | Усечён в конце | Не хватало ~2300 символов |
| `cabinet/student.html` | Усечён | Не хватало ~134 символов |
| `cabinet/parent.html` | Усечён | Не хватало ~123 символов |
| `cabinet/index.html` | Усечён | Не хватало ~635 символов |
| `cabinet/login.html` | Усечён | Не хватало ~635 символов |

### АРХИТЕКТУРНЫЕ (обнаружены, не требуют немедленного фикса)

1. **`conditions.html` — старый inline `toggleTheme()`**: использовал `classList.toggle("light")` напрямую с emoji-иконками (☀ ☾), не делегировал `window.NGETheme`. Не грузил `site.js` / `theme-cycle.js`.

2. **`cases.html` — `system.css` в конце файла**: подключался на строке 1598 из 1806 (после 1500 строк inline-стилей), вызывая потенциальный FOUC. `site.js` и `theme-cycle.js` при этом грузились в `<head>`.

3. **`lingua-boost-lab/index.html` — каталог не включал 4 новых урока A1**: файлы `a1-01` .. `a1-04` существовали, но в каталоге не было карточек. Секция показывала "4 модуля" вместо 8.

4. **`diagnostic-test.html`** — полностью самодостаточен, не грузит `system.css`. Это архитектурно корректно (изолированный инструмент), но визуально он выглядит как отдельный продукт.

5. **`programs.html` и `about-project.html`** — `system.css` подключается ПОСЛЕ 600–900 строк inline-стилей. Работает корректно (inline правила привязаны к `body[data-page="..."]`), но порядок неоптимален.

6. **Lab lessons a1-01..04** — не грузят `studio-module-shell.js` (загружают только встроенный JS). Это намеренно или упущено — необходима отдельная проверка.

---

## ФАЗА 3 — ВЫПОЛНЕННЫЕ ИСПРАВЛЕНИЯ

### Исправление 1 — Точка возврата
**Создан архив** `_internal/backups/arch-stability-audit-20260503/` с копиями 4 ключевых файлов до начала правок.

---

### Исправление 2 — `lingua-boost-lab/index.html` (КРИТИЧЕСКОЕ)
**Проблема:** Файл усечён на середине CSS-правила `.section-head::after`. Нет `</style>`, `</head>`, `<body>`, HTML-контента. Страница показывала пустой экран.

**Причина поломки:** Незавершённая операция записи CSS-патча (81 KB CSS без закрытия тега).

**Исправление:**
- Взят CSS из текущего файла до последнего завершённого правила (`.hero-banner img.hero-bg { top: calc(50% + 2cm) }`)
- Добавлен HTML-body из резервной копии `_internal/old-github-publish-snapshot/lingua-boost-lab/index.html`
- Добавлены карточки для 4 новых уроков серии A1 (a1-01..a1-04) перед старыми тематическими уроками A1
- Обновлён счётчик секции с "4 модуля" на "8 модулей"

**Файлы изменены:** `lingua-boost-lab/index.html`

**Проверено:** структура HTML, JS-тема (`applyLabTheme`), все ссылки на модули, `studio-module-shell.js`

---

### Исправление 3 — `index.html` (КРИТИЧЕСКОЕ)
**Проблема:** Файл усечён в области footer. Отсутствовали: последний параграф об услугах, `</footer>`, inline `toggleTheme()` / `toggleLang()`, `site.js`, `theme-cycle.js`, cookie-banner, `</body>`, `</html>`. Кнопки темы и языка были в разметке, но функции не были определены → `ReferenceError`.

**Исправление:**
- Найдена точка усечения в резервной копии (`site-links-before-cabinet-connect-20260503-003549`)
- Восстановлен хвост (~2200 символов): footer закрытие, inline delegates, `site.js`, `theme-cycle.js`, cookie-banner, закрывающие теги

**Файлы изменены:** `index.html`

---

### Исправление 4 — `cases.html` (КРИТИЧЕСКОЕ + АРХИТЕКТУРНОЕ)
**Проблема 1:** `system.css` подключался на строке 1598 из 1806 (конец файла) — после всего HTML. При этом `site.js` / `theme-cycle.js` были в `<head>`. Создавал потенциальный FOUC.

**Исправление 1:** CSS-ссылки перемещены в `<head>` (после Google Fonts, позиция ~900 символов).

**Проблема 2:** Файл усечён — отсутствовали footer, JS-блоки (данные кейсов, функции рендера), `site.js`, `theme-cycle.js`, `</body>`, `</html>`.

**Исправление 2:** Восстановлен хвост ~24 KB из резервной копии.

**Файлы изменены:** `cases.html`

---

### Исправление 5 — `conditions.html` (АРХИТЕКТУРНОЕ + ТЕХНИЧЕСКИЕ)
**Проблема 1:** Файл содержал null-байты (`\x00 × 200`) в конце — признак незавершённой записи.

**Проблема 2:** Встроенный скрипт `toggleTheme()` использовал прямой `classList.toggle("light")` без делегирования к `window.NGETheme`. Кнопка темы показывала emoji (☀/☾) вместо текста (DARK/LITE). Файл не грузил `site.js` / `theme-cycle.js`.

**Исправление:**
- Null-байты удалены
- Старый inline-скрипт (~30 строк) заменён тонким делегатом (6 строк) + добавлены `site.js` и `theme-cycle.js`
- `unlockProtectedDocument()` сохранён (используется для скачивания документов)

**Файлы изменены:** `conditions.html`

---

### Исправление 6 — `blog.html`, `cabinet/student.html`, `cabinet/parent.html`, `cabinet/index.html`, `cabinet/login.html`
**Проблема:** Все 5 файлов усечены в конце — отсутствовали закрывающие теги и скрипты.

**Исправление:** Восстановлен хвост каждого файла из соответствующих резервных копий.

**Файлы изменены:** `blog.html`, `cabinet/student.html`, `cabinet/parent.html`, `cabinet/index.html`, `cabinet/login.html`

---

## ФАЗА 4 — РЕГРЕССИОННЫЙ ЧЕК-ЛИСТ (после правок)

### Структурная проверка (автоматическая)

| Файл | `</body>` | `</html>` | `system.css` | `site.js` | `theme-cycle.js` |
|------|-----------|-----------|-------------|----------|-----------------|
| index.html | OK | OK | OK | OK | OK |
| about-project.html | OK | OK | OK | OK | OK |
| programs.html | OK | OK | OK | OK | OK |
| cases.html | OK | OK | OK (head) | OK | OK |
| conditions.html | OK | OK | OK | OK | OK |
| blog.html | OK | OK | OK | OK | OK |
| travel.html | OK | OK | OK | OK | OK |
| diagnostic-test.html | OK | OK | n/a (изолир.) | n/a | n/a |
| lingua-boost-lab/index.html | OK | OK | n/a (изолир.) | OK (встр.) | OK |
| cabinet/index.html | OK | OK | OK | OK | OK |
| cabinet/login.html | OK | OK | OK | OK | OK |
| cabinet/student.html | OK | OK | OK | OK | OK |
| cabinet/teacher.html | OK | OK | OK | OK | OK |
| cabinet/parent.html | OK | OK | OK | OK | OK |

### Проверки, которые нужно выполнить вручную в браузере

**Обязательный регрессионный список после этих правок:**
1. `index.html` — кнопки DARK/LITE и RU/EN работают, тема сохраняется
2. `conditions.html` — кнопки темы работают (не emoji), скачивание документов работает
3. `cases.html` — видео, галерея, отзывы рендерятся, тема работает
4. `lingua-boost-lab/index.html` — каталог отображается, тема `#labThemeToggle` работает, видны все 8 карточек A1
5. Переход из кабинета в лабораторию — тема передаётся
6. Мобильная версия главной — нет горизонтального скролла

---

## ФАЗА 5 — ОСТАВШИЕСЯ РИСКИ

### Требуют внимания в следующей задаче

1. **`programs.html`, `about-project.html`, `index.html`** — `system.css` подключается ПОСЛЕ большого блока `<style>`. Работает, но идеально перенести CSS в `<head>`. Риск: FOUC на медленном соединении.

2. **Lab lessons a1-01..a1-04** — не грузят `studio-module-shell.js`. Если там нужен tap-drag fallback или lang-toggle лаборатории — нужна отдельная проверка.

3. **`diagnostic-test.html`** — полностью изолирован, своя тема, не связан с `system.css`. При смене глобальной темы — диагностика выглядит иначе. Это приемлемо, но стоит задокументировать как намеренное решение.

4. **`programs.html` и `conditions.html`** — имеют null-байты (`programs`: 666, `conditions` исправлен). `programs.html` стоит проверить и пересохранить без null-байтов при следующей правке.

5. **Каталог lab** — нет механизма автоматической синхронизации между реально существующими файлами уроков и карточками в `index.html`. При добавлении нового урока нужно вручную добавлять карточку.

### Что запрещено трогать без отдельного задания

- `video-review-eva/` — защищённая зона
- Учебный контент уроков (текст, задания)
- Юридический текст `conditions.html`
- Персональные данные кабинетов
- `diagnostic-test.html` — изолированный инструмент, не перепутать с сайтом

---

## ФАЗА 6 — АРХИТЕКТУРНЫЕ ВЫВОДЫ И РЕКОМЕНДАЦИИ

### Карта стабильных паттернов (что работает хорошо)

- **Скопированные классы scoped к `body[data-page="..."]`** — `programs.html` делает это правильно
- **`theme-cycle.js` читает два ключа** — мост между сайтом и кабинетом работает
- **`cabinet.css` полностью через CSS-переменные** — правильная изоляция
- **`studio-module-shell.js` как единая оболочка уроков** — правильный принцип

### Правила для следующего разработчика/AI

**CSS:**
1. `system.css` подключать ДО любых inline `<style>` блоков, в `<head>`
2. Локальные стили привязывать к `body[data-page="..."]` или `.lab-*` корню
3. Не писать глобальные `.card`, `.section`, `.btn` без контекста страницы
4. `!important` только в `system.css` как overrides legacy per-page rules (уже есть в topbar)

**JS:**
5. Не создавать новый `toggleTheme()` — только делегат к `window.NGETheme.toggleTheme()`
6. Не создавать новый `toggleLang()` — только делегат к `window.toggleLang`
7. `site.js` + `theme-cycle.js` обязательны на всех публичных страницах
8. Для кабинетов — `app.js` самодостаточен, `theme-cycle.js` туда не добавлять

**Файлы:**
9. После каждой крупной записи — проверять, что файл не усечён (есть `</html>`)
10. Перед правкой — создавать точку возврата в `_internal/backups/`

**Темы:**
11. Публичный сайт: `nge-theme` (dark/light), кнопка DARK/LITE
12. Кабинет: `nge-cabinet-theme` (dark/light), кнопка с символом
13. Lab/index: использует `nge-theme`, цикл dark→light→sky (3 темы)
14. Lab/lessons new: свои встроенные темы, изолированы полностью

### Порядок проверки для следующего AI

1. Проверить целостность файла (`</html>` присутствует)
2. Проверить позицию `system.css` (должен быть в `<head>` до inline `<style>`)
3. Проверить наличие `site.js` + `theme-cycle.js` на странице
4. Проверить, что `toggleTheme()` делегирует к `NGETheme`, а не работает напрямую
5. После правки CSS — убедиться, что соседние страницы не сломаны (см. список регрессии)

---

**Итог:** 9 критических усечений восстановлено. 1 архитектурный конфликт темы устранён. 1 проблема позиции CSS исправлена. 4 новых урока добавлены в каталог лаборатории. Все файлы проверены автоматически.
