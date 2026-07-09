# LinguaBoost Lab — Архитектура урока (canonical)

Один файл, где живут все правила и все ссылки на кирпичи. Открывать перед каждым новым уроком.

## 1. Один урок = одна HTML-страница

```
lingua-boost-lab/<level>/<slug>/index.html   ← для полноценных уроков со своими ассетами
lingua-boost-lab/<level>/<slug>.html         ← для одностраничных уроков без ассетов
```

Уровни: `pre-a1`, `a1`, `a2`, `b1`, `b2-plus`, `c1`, `practice`, `trial-academic-abroad`.

## 2. Обязательные скрипты в `<head>` / перед `</body>`

Порядок важен: сначала supabase-realtime (для sync/firehose), потом lab-* в порядке ниже.

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="../assets/lab-manifest.js?v=..." defer></script>
<script src="../assets/lab-pilot.js?v=..." defer></script>
<script src="../assets/lab-mic-wpm.js?v=..." defer></script>
<script src="../assets/lab-ai-feedback.js?v=..." defer></script>
<script src="../assets/lab-sync.js?v=16" defer></script>
<script src="../assets/lab-tabs.js?v=12" defer></script>
<script src="../assets/lab-homework.js?v=38" defer></script>
<script src="../assets/lab-vocab-builder.js?v=48" defer></script>
<script src="../assets/lab-coach-persist.js?v=1" defer></script>
<script src="../assets/lab-speech-tester.js?v=11" defer></script>
<script src="../assets/lab-quick-speak.js?v=4" defer></script>
```

Пути в `<level>/<slug>/index.html` — `../../assets/…`; в `<level>/<slug>.html` — `../assets/…`.
Cache-buster `?v=N` **обязателен**. Когда меняется shared asset — bump везде.

Скрипты, что делают что:

| script                       | зачем                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `lab-manifest.js`            | манифест урока, регистрация в total.                                              |
| `lab-pilot.js`               | UI пилота: топбар, темы, hero, TOC, кнопка «в домашку».                            |
| `lab-mic-wpm.js`             | speaking WPM/mic-drill.                                                            |
| `lab-ai-feedback.js`         | AI-фидбек по ответам в домашке.                                                    |
| `lab-sync.js`                | teacher/observer mirror через Supabase Realtime.                                   |
| `lab-tabs.js`                | вкладки «Урок / Моя домашка» под topbar.                                          |
| `lab-homework.js`            | плюсы `+` рядом с упражнениями, клон в raw-block, доставка в `.homework/`.        |
| `lab-vocab-builder.js`       | секция «📖 Vocabulary», подсветка слов, teacher `+ в словарь`, click-to-vocab.    |
| `lab-coach-persist.js`       | сохранение прогресса ученика.                                                      |
| `lab-speech-tester.js`       | speaking-задания с распознаванием.                                                 |
| `lab-quick-speak.js`         | inline «say it» на строках.                                                        |

## 3. Vocabulary — как это работает

Урок объявляет:

```html
<script>
  window.LAB_VOCAB = [
    { word: 'environment', ipa: '/ɪnˈvaɪrənmənt/', ru: 'окружающая среда',
      example: 'We must protect the environment.', audio: 'assets/audio/env.mp3' },
    { word: 'pollution', ipa: '/pəˈluːʃən/', ru: 'загрязнение' },
    ...
  ];
</script>
```

`lab-vocab-builder.js` v48+ автоматически:
1. Строит секцию `📖 Vocabulary` (flip-cards) в конце главной колонки.
2. Подсвечивает каждое слово из `LAB_VOCAB` в тексте `.card, p, li`.
3. Кнопка `🔊` — если задан `audio`, играет файл; иначе TTS через `speechSynthesis`.
4. Кнопка `➕` — кладёт слово в домашку через `lab-homework`.
5. Teacher `+ в словарь` — выделяю слово в тексте → плавающая кнопка → mini-modal (word/IPA/ru/example) → добавляется в localStorage `extras` и в vocab section.
6. **Click-to-vocab (v48)** — учитель, ученик или observer кликают ЛКМ на слово в тексте `.card / .reading / .story / .passage / .lab-bridge` → слово добавляется в vocab section. Guards исключают клики в `.homework`, `.lab-hw-*`, `.lab-vocab-section` и по интерактивам упражнений (mc-opt / tf-btn / choice / bank-word / word-chip / drag-item / drop-* / match-* / wo-pill / ord-*).

## 4. Homework — как это работает

`lab-homework.js` v38+:

- Добавляет `+` кнопки к каждому упражнению по селекторам архетипов (MCQ / TF / gap / match / ord / vocab / prompt / builder / card).
- При клике `+` клонирует «хост» упражнения через `cleanRawClone(node)`:
  - убирает `lab-hw-*`, `script`, `style`, `link[rel=stylesheet]`, `details.teacher`, `.answer-key`, `.reveal`, `.solution`, `.correct-answer`, `.listen-script`, `.transcript`;
  - подчищает inline `background`/`color` в `[style]` (родные цвета урока прячутся, палитра `.homework` берёт своё);
  - `src`/`href` относительные → абсолютные.
- Каждому клону присваивается уникальный `section_id = ${sectionId}:${kind}:${nodeFingerprint(host)}`. Это фиксит julia-vampire, где 10 vocab-карточек имели одинаковый question и взаимно toggle-удалялись.
- Item попадает в `localStorage['lab-hw:' + lessonPath]` как `{ kind: 'raw-block', question, html, section_id, ts }`. Для vocab-карточек `kind: 'vocab'` с полями `en/ipa/ru/ex`.
- Прямая ссылка на домашку: `.homework/?lesson=<encoded lessonPath>`.

## 5. `.homework/index.html` — как рендерит raw

`.homework` — независимая страница, живёт в `lingua-boost-lab/.homework/index.html`. Топбар, вкладка «Моя домашка» рядом с уроком, палитра синхронизирована через `lab-theme-sync.js`.

Rendering item:

1. `head` — номер + kind-chip + question.
2. `body` — для `raw-block` = `<div class="raw">${item.html}</div>`; для `vocab` = собственная vocab-card.
3. `answer` — textarea для ученика (учитель видит readonly или empty).
4. Крест `×` удаления справа сверху.
5. `hydrateRawAnswers(article)` — сбрасывает наследованные из HTML урока классы `correct / wrong / selected / is-correct / filled / used / revealed / [data-state]` и накатывает сохранённое состояние ученика. Это фиксит эффект «Voyager всё зелёное на входе».

CSS-правила для `.raw` (только внутри `.homework`, уроки не трогаются):

- `.raw` — border, radius, padding, `max-height: min(720px, 60vh); overflow-y: auto` на desktop; mobile — без cap.
- `.raw img / picture img / figure img / [class*=img] img` — `max-height: 380px !important; object-fit: contain !important`.
- Structural flatten для containers: `section / .section / .card / .story-block / .round-card / .game-card / .info-card / .error-card / .prompt-card / .now-item / .tile / .output-box / .match-wrap` — transparent bg, no shadow, no border, no padding.
- UI-мусор из уроков (nav / header / footer / hero / lab-hero / hero-banner / lesson-hero / topbar / snake-overlay / lb-overlay / img-story-overlay / tracker / progress-bar) — `display: none !important`.
- Interactive классы `.raw button / .mc-opt / .tf-btn / .btn-tf / .choice / .choice-btn / .bank-word / .word-chip / .drop-slot / .drop-gap / .drop-zone / .match-place / .match-drop / .match-slot / .wo-pill / .ord-card / .ord-chip / .predict-btn` — визуально показываются как «пилюли», реагируют на клик через общий handler.

Общий JS-handler в `.homework` понимает:

- MCQ / TF / выбор одного ответа — рассматривается по ближайшей группе `rawChoiceGroupSelector`. Правильный ответ ищется по `data-correct / data-answer / data-expected / data-ans / data-a / value / text`.
- Bank → drop-gap / drop-slot / drop-zone — pick word, place, verify, save.
- Match — pick left → click right.
- Ordering / word-order — pill в bank ↔ slot, check по `data-words / data-answer`.
- Flip-cards — `.flipped` toggle.
- TTS кнопки с `data-say` / `.play` — озвучиваются через `speechSynthesis` (`handleRawPlayButton`).

## 6. Teacher / observer / ученик — режимы

URL-флаги:

| режим     | URL                                | доступ                                                                   |
| --------- | ---------------------------------- | ------------------------------------------------------------------------ |
| ученик    | без флагов                         | UI урока + подсветка + click-to-vocab + `+` в домашку.                    |
| учитель   | `?teacher=on` (canonical)          | + teacher-баннер, teacher-mirror, `+ в словарь` через selection.          |
| observer  | `?observe=<roomId>`                | смотрит зеркало ученика, click-to-vocab транслируется в firehose ученику. |

Sticky флаг учителя: `localStorage['lab-teacher-mode'] = 'on'`.

Проверять для каждого изменения teacher UI:
- `?teacher=on`, `?teacher=1`, `?role=teacher`, `?observe=<room>&role=teacher`, `?v=v7&theme=light-lab&lang=ru&teacher=on`.

## 7. Realtime backbone (Supabase)

- URL: `https://iqzlphbvmfgoygnozbya.supabase.co`.
- Anon key: `sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO`.
- Каналы:
  - `lab-firehose-v1` — vocab push / vocab remove (observer → ученик).
  - `student-<slug>` — teacher-mirror ответов, live typing.

## 8. Premium урок

- URL остаётся публичным, но контент прячется за AES-GCM vault.
- PIN хранится в `localStorage['lab-premium-pin']` после ввода.
- Vault repack — Node-скрипт с текущим PIN. Ключи из git log site-public-clean.
- **Правило:** PIN никогда не зашивать в публичные ссылки/кнопки. Открывается только вводом PIN руками.

## 9. Cache-buster протокол

Когда меняешь shared asset — bumps во ВСЕХ уроках, которые его подключают. Bulk-replace через PowerShell:

```powershell
Get-ChildItem -Recurse -File -Filter '*.html' | ForEach-Object {
  $c = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  if ($c -match 'lab-<asset>\.js\?v=<old>') {
    Set-Content -LiteralPath $_.FullName -Value ($c -replace 'lab-<asset>\.js\?v=<old>', 'lab-<asset>.js?v=<new>') -Encoding UTF8 -NoNewline
  }
}
```

Проверять что diff трогает только строку `<script src="..." >` — а не содержимое урока.

## 10. Мандат «уроки не трогать»

Правки только в `assets/*.js`, `.homework/index.html`, `assets/*.css` (если появится), `ARCHITECTURE.md`. Уроки — источник правды. Bump `?v=` в HTML уроков — единственное разрешённое исключение.

## 11. Аудитный тулинг

- `_scan_reports/sweep_homework_audit.mjs` — прогон по всем 61 урокам: enumerates `+`, кликает, проверяет localStorage, открывает `.homework`, снимает признаки `oversized / imgTooBig / greenInitial / emptyRaw / audioTts`.
- `_scan_reports/batch_smoke.mjs` — batch на 10 уроков разного архетипа: скриншоты lesson + homework, click-to-vocab check.
- `_scan_reports/click_vocab_test.mjs` — real mouse click проверка click-to-vocab.
- Отчёты — `_scan_reports/sweep_summary.json`, `_scan_reports/batch_smoke.json`, скрины — `_scan_reports/screenshots/`.

Запускать перед каждым push, если менялись shared assets или `.homework`.

## 12. Speech Coach — единый стандарт (2026-07-08 мандат Марии)

Speech Coach — секция с задачей + criteria + Web Speech Recognition для устного ответа. Строится `lab-speech-tester.js` (v13+).

### Позиция в уроке

**ПРЕДПОСЛЕДНЕЕ упражнение, СТРОГО ДО футера.** Не в самом конце.

`lab-speech-tester.js` при init делает `insertBefore(sections[sections.length-1])` — ставит Coach перед последней `section.section`. Если урок имеет свой inline Coach в правильном месте, script не трогает.

### 3 варианта Coach в уроках

| тип                          | пример                                | когда                                                          |
| ---------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| **Custom inline grader**     | `stage-vs-screen-ege` (Speaking Task 4) | ЕГЭ / spot-scoring с 10 criteria + Photo A/B + teacher mirror  |
| **`lab-coach-config` inline** | `russia-my-homeland`                 | Урок задаёт свой JSON `{task, criteria}` через `<script id="lab-coach-config">` |
| **Universal fallback**       | все остальные 30+ уроков              | Если Pollinations не отвечает — используется универсальный набор 7 criteria (см. ниже) |

### Universal fallback (v13+)

Если нет своего config → 7 unified criteria одинаковые для всех уроков:
1. **Topic covered** — mention lesson theme (topic/lesson/today/about)
2. **Key vocabulary** — 5+ topic-specific words
3. **Personal example** — i had / i remember / in my life / for me
4. **Opinion** — i think / i believe / in my opinion / i love / i prefer
5. **Linkers** — however / moreover / because / for example / also
6. **Structure** — first / then / next / finally / to sum up
7. **Length ≥ 2 min** — talk for two full minutes

Task: `Talk for 2-3 minutes on the topic of this lesson: <title>. Explain the key idea, give one example from your life, share your opinion.`

### Как урок задаёт свой Coach

```html
<script type="application/json" id="lab-coach-config">
{
  "task": "Tell us about ...",
  "criteria": [
    { "label": "Capital / iconic places mentioned", "hint": "Moscow / Kremlin", "keywords": ["moscow", "kremlin"] }
  ]
}
</script>
<script src="../assets/lab-speech-tester.js?v=13" defer></script>
```

### `.homework` клон Speech Coach

По мандату 1-в-1: `.raw` больше не имеет `max-height 720px + overflow` (было убрано в `1103f6f9`). Speech Coach в клоне отображается полной высоты, включая criteria, record button, teacher code.

## 13. Как рождается новый урок — короткий чек-лист

1. Скопировать структуру ближайшего эталона того же архетипа.
2. `<title>`, `<h1>`, `hero-card` — свои.
3. `window.LAB_VOCAB` — минимум 10-16 слов, всё в объектах `{word, ipa, ru, example, audio?}`.
4. Упражнения — из канонических классов (см. секцию 5). НЕ придумывать новые имена без нужды.
5. Speaking prompts — минимум 8-10 предложений на задание (см. `feedback_speaking_task_length.md`).
6. MCQ правильные ответы — вперемежку между заданиями. Не подряд A/A/A/A.
7. Все обязательные `<script src="../assets/lab-*.js?v=...">` — с актуальными версиями.
8. Прогнать `sweep_homework_audit.mjs`, посмотреть свой урок в отчёте: `addButtons` > 0, `stored == added`, `greenInitial: 0`, `oversized: 0`.
9. Открыть `.homework/?lesson=/lingua-boost-lab/<path>/` глазами, кликнуть 5-6 добавлений, проверить каждое.
10. Push, дождаться Pages deploy, live-verify.

---

## 14. Актуальные версии assets (2026-07-09 · конец дня)

Обновлённая версия подключений — использовать в любом новом уроке:

```html
<link rel="stylesheet" href="../../assets/canon-L.css?v=11">
<link rel="stylesheet" href="../../assets/lab-pilot.css?v=7">   <!-- ОБЯЗАТЕЛЬНО без css лифт невидимо -->
<script src="../../assets/canon-L.js?v=5" defer></script>

<!-- перед </body> -->
<script src="../../assets/lab-persist.js" defer></script>
<script src="../../assets/lab-total.js?v=4" defer></script>
<script src="../../assets/lab-pilot.js?v=4" defer></script>
<script src="../../assets/lab-mic-wpm.js?v=1" defer></script>
<script src="../../assets/lab-ai-feedback.js?v=6" defer></script>
<script src="../../assets/lab-sync.js?v=16" defer></script>
<script src="../../assets/lab-tabs.js?v=12" defer></script>
<script src="../../assets/lab-homework.js?v=43" defer></script>
<script src="../../assets/lab-telemost.js?v=1" defer></script>
<script src="../../assets/lab-vocab-builder.js?v=52" defer></script>
<script src="../../assets/lab-lexicon.js?v=1" defer></script>
<script src="../../assets/lab-coach-persist.js?v=1" defer></script>
<script src="../../assets/lab-speech-tester.js?v=14" defer></script>
```

## 15. Инциденты 2026-07-09 и правила из них

### 15.1 lab-pilot селектор — расширен до `section.block`

`lab-pilot.js` до v4 искал только `section.section`. Уроки архетипа Present Simple (a1-01…a1-08) используют `section.block` — **лифт вообще не активировался** (fab:0, toc:0, submit:0).

**v4**: `section.section, section.block, section.lab-section, section.canon-l-section, section.lesson-section`. Правило: если новый архетип использует свой класс секций — добавить в селектор `lab-pilot.js`.

### 15.2 lab-pilot.css **обязательно** подключать `<link>` в `<head>`

a1-01 был единственный без — лифт был, но невидимо (без стилей). **Правило**: если подключён `lab-pilot.js`, ОБЯЗАТЕЛЬНО `lab-pilot.css?v=7` в `<head>`.

### 15.3 Supabase 400 · `pct` = generated column

`lab-homework.js` до v42 слал `pct: 0` в payload. Supabase отклонял: `Column pct is a generated column · cannot insert a non-DEFAULT value`. Все cloud-push падали, за целый день ноль записей.

**Правило**: не добавлять `pct` в payload для `lab_submissions`. Колонка вычисляется автоматически (`score/total*100`).

### 15.4 `.homework/` палитра — regex `[data-theme="X"]`, не только `:root`

`applyLessonTheme()` до v5 искал только `:root { --bg: ... }`. Уроки объявляют темы через `[data-theme="light-lab"] { ... }` — regex ничего не находил, `.homework/` оставался default тёмная палитра (vocab-card «get up» на #061428 — не читается).

**v5 фикс** в `.homework/index.html`:
- Extract из `[data-theme="<active>"]` через regex, `:root` fallback.
- Тема берётся из `?theme=` URL query или `data-theme` root.
- `openHomeworkPage()` в `lab-homework.js` forward'ит `&theme=<current>` при переходе.
- Устанавливает `data-theme` на root чтобы будущие условные CSS сработали.

### 15.5 Ширина Lesson total = `.lesson-foot` 1-в-1

`.lesson-foot` через Codex-etalon 20260512 (в inline `<style id="codex-lesson-foot-etalon-20260512">`) переопределён:
```
width: min(calc(100% - 2cm), 1320px) !important;
max-width: 1320px !important;
```

А `.block` — `min(100% - 56px, 1180px)`. **Разные!** Если делаешь свой блок «под navigation» — использовать формулу `.lesson-foot`, не `.block`. Проверить через `getBoundingClientRect().width` в puppeteer — обе должны быть 1320.

### 15.6 Cloud sync для анонимов — fallback на `solo-<random>`

`lab-homework.js` до v41 полностью скипал `cloudPushHwState` если `getName()` пустой (`if (!name) return`). **v41 фикс**: fallback на `solo-` из localStorage (тот же ID что `roomFor()` возвращает). Non-identified ученик всё равно попадает в облако как отдельный room; когда введёт имя — следующая запись пойдёт под `homework:<name>`.

### 15.7 Speech Coach — ПЕРЕД `<nav.lesson-foot>`, не после

`lab-speech-tester.js` ищет anchor через `section.section`. В A1 архетипе таких нет → падает перед `<footer>`, что помещает Speech Coach ПОСЛЕ `<nav.lesson-foot>`. Coach становится последним блоком урока — Мария явно сказала «не должен быть последним».

**Для A1 цикла** — override в `a1-cycle-tweaks.js`: MutationObserver перемещает `.lab-coach-section` перед `<nav.lesson-foot>` внутри main.wrap.

### 15.8 vocab-upgrade `kind='raw-block' → 'vocab'` при клике на .vocab-card

`lab-homework.js` universal-flow превращает КАЖДЫЙ + click в `item.kind='raw-block'`. Но `.homework/index.html` имеет отдельную красивую ветку для `kind='vocab'` с `en/ipa/ru/ex` полями — она НЕ срабатывала.

**Фикс в `a1-cycle-tweaks.js`**: MutationObserver отслеживает click на `.vocab-card .lab-hw-add`, через 60мс находит последний item в localStorage и апгрейдит `kind → 'vocab'` + добавляет структурированные поля. Плюс sticky-marker «✓ в домашке» и `bigToast('Слово X в домашке')`.

## 16. Новые ассеты 2026-07-09

### 16.1 lab-telemost.js v1 · 🎥 FAB Yandex Telemost

Одна persistent-ссылка на всех: `https://telemost.yandex.ru/j/03400912122761`.

Floating pill top-right (top:66px на desktop, 16px на mobile), pulse-анимация, `target="_blank"`. Skip observer/teacher-mode.

**Важно**: iframe embed НЕВОЗМОЖЕН — Yandex ставит `X-Frame-Options: SAMEORIGIN`. Только новая вкладка.

Подключено в 56 живых Lab-уроках (grep по `lab-homework.js`).

### 16.2 lab-lexicon.js v1 · 📒 Today's Lexicon

Floating pill bottom-right — сборщик слов при клике на `.vocab-card` / `.flip-card[data-en]` / `.tr[data-ru]`.

localStorage `lab-lex:<pathname>` · TTL 7 дней · MutationObserver ре-биндит новые карточки (например extras от `lab-vocab-builder`).

**Skip если есть `#vocabBox`** — Voyager L1-L4 имеет свой встроенный vocab-box с уникальной механикой (feed от inline `.tr[data-ru]` подсветок), не дублируем.

Подключено в 21 уроке (все A1 01-08 + Pre-A1 + A1 free-standing + A2-B1 + B1 + C1). Voyager остаётся на своём.

## 17. Домен, кэш, deploy — что запомнить

- `newgeneration-english.ru` = **GitHub Pages + Fastly CDN** (не Cloudflare, как раньше писали!). HTML `Cache-Control: max-age=600` = 10 мин. Ctrl+Shift+R обходит.
- Кабинет `cabinet.newgeneration-english.ru` = **Cloudflare Pages**, `no-cache, must-revalidate`. Свежее сразу.
- **Двойной push обязателен** (feedback: `feedback_dual_push_lab_repos.md`):
  1. `site-public-clean/` → `mariabwhite/newgeneration-english` main (production)
  2. `site/` → `mariabwhite/newgeneration` **`gh-pages`** (NOT `deploy-gh-pages` — legacy branch, ничего не деплоит)
- Для второго push сначала commit в `deploy-gh-pages`, потом `git checkout gh-pages && git merge deploy-gh-pages && git push origin gh-pages`.

## 18. Cabinet — новые поля 2026-07-09

Кабинет (в `nge-cabinet/data.js`) получил два новых массива:
- `archived_packages: [{ label, lessons[] }]` — закрытые абонементы. Рендерятся как `<details>` 📦, свёрнуто.
- `future_plan_lessons[]` + `future_plan_label` — план на следующий период. `<details>` 🗓 свёрнуто.

Legacy `past_lessons` + `past_lessons_label` — поддерживаются, авто-конверт в `archived_packages` при рендере.

Регламент кабинета — отдельный документ, поддерживается автономно (см. `reference_cabinet_pipeline_full.md` в памяти Клода).

---

*Последнее обновление: 2026-07-09 (Синтия). Секции 14-18 добавлены по мандату Марии «занеси всё что сегодня вычленили в регламенты». lab-pilot v3→v4, lab-homework v40→v43, добавлены lab-telemost + lab-lexicon.*
