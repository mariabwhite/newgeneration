# LinguaBoost Lab system plan

Дата: 2026-04-30

## Цель

LinguaBoost Lab нужно развивать не как набор отдельных тренажёров, а как учебную систему. Базовая рамка: по 8 модулей на каждую учебную линейку/уровень, с единым шаблоном урока, понятным порядком прохождения и связью с кабинетами ученика, родителя и преподавателя.

## Текущее состояние

Сейчас в рабочей папке есть 12 HTML-юнитов:

| Линейка | Есть | Нужно до 8 | Дефицит |
| --- | ---: | ---: | ---: |
| Pre-A1 | 1 | 8 | 7 |
| A1 | 4 | 8 | 4 |
| A2 | 2 | 8 | 6 |
| B1 / B1+ | 4 | 8 | 4 |
| B2+ | 1 | 8 | 7 |
| C1 | 0 | 8 | 8 |
| C2 | 0 | 8 | 8 |

Итого сейчас: 12 модулей. Если считать 7 линеек по 8 модулей, целевой объём: 56 модулей. Не хватает 44 модулей.

## Что уже есть

### Pre-A1

1. Hello Classroom Fun

### A1

1. School Words and Pronouns
2. Prepositions World
3. Past Simple Adventure
4. Easter English Lesson

### A2

1. Ancient China Explorer
2. Core Trainer A2-B1

### B1 / B1+

1. Word Building: Prefixes and Suffixes
2. Ancient China: Cultural Studies
3. Beyond Earth: Space Explorers
4. Restaurant Menu Lab

### B2+

1. Articles with Geographical Names

### C1

Пока нет HTML-юнитов.

### C2

Пока нет HTML-юнитов.

## Предлагаемая структура одного модуля

Каждый модуль должен быть не просто страницей, а мини-уроком с повторяемой педагогической логикой:

1. Цель урока: что ученик сможет сделать после модуля.
2. Warm-up: короткий вход в тему.
3. Input: слова, грамматика или модель речи.
4. Guided practice: задания с подсказками.
5. Active practice: самостоятельные задания.
6. Speaking/writing output: маленький итоговый продукт.
7. Check yourself: самопроверка или быстрый результат.
8. Teacher note: что преподавателю смотреть и как назначать.

## Предлагаемая сетка по 8 модулей

### Pre-A1

1. Hello Classroom Fun
2. Colours and Classroom Objects
3. Numbers 1-20
4. My Family
5. Animals and Actions
6. Food I Like
7. My Day: First Routines
8. Mini Review: Say, Point, Choose

### A1

1. School Words and Pronouns
2. Prepositions World
3. Past Simple Adventure
4. Easter English Lesson
5. To Be and Have Got
6. Present Simple Routines
7. There Is / There Are
8. A1 Review Quest

### A2

1. Ancient China Explorer
2. Core Trainer A2-B1
3. Past Continuous Stories
4. Comparatives and Superlatives
5. Travel English: Tickets and Hotels
6. Future Plans: Going To / Will
7. Modal Verbs for Advice and Rules
8. A2 Review Mission

### B1 / B1+

1. Word Building: Prefixes and Suffixes
2. Ancient China: Cultural Studies
3. Beyond Earth: Space Explorers
4. Restaurant Menu Lab
5. Reported Speech Lab
6. Conditionals in Real Life
7. Opinion Essay Builder
8. B1 Speaking Exam Studio

### B2+

1. Articles with Geographical Names
2. Advanced Collocations Lab
3. Linking Devices for Essays
4. Inversion and Emphasis
5. Academic Reading: Argument and Evidence
6. Cleft Sentences and Nuance
7. Debate Studio: Pros, Cons, Rebuttal
8. B2+ Precision Review

### C1

1. Register and Style Shifts
2. Hedging and Nuanced Opinion
3. Advanced Paraphrasing Studio
4. Complex Argument: Claim, Evidence, Impact
5. Academic Listening and Note-taking
6. Idioms, Metaphor, and Tone
7. C1 Speaking: Long Turn and Discussion
8. C1 Review: Precision and Fluency

### C2

1. Near-native Collocation and Connotation
2. Rhetoric and Persuasive Framing
3. Advanced Error Editing
4. Literary and Cultural Reading Lab
5. High-level Debate and Rebuttal
6. Subtle Grammar: Emphasis, Ellipsis, Inversion
7. C2 Writing: Voice, Cohesion, Control
8. C2 Mastery Review

## Следующий рабочий шаг

Не стоит сразу создавать 28 HTML-страниц вручную. Сначала нужен единый технический и методический шаблон модуля.

Первый практический шаг:

1. Выбрать одну линейку для пилота, лучше A1 или A2.
2. Сделать эталонный шаблон модуля: структура секций, кнопки, состояния, проверка ответов, светлая/тёмная тема, мобильная версия.
3. Перенести 1 существующий урок в этот шаблон.
4. После проверки размножать шаблон на остальные недостающие модули.

## Важные ограничения

- Не трогать `video-review-eva/`.
- Не обновлять `newgeneration-github-publish/` до финальной проверки.
- Не плодить разные стили уроков: все новые модули должны выглядеть как части одной системы.
- Каждый новый модуль должен попадать в `lab-manifest.js`, каталог лаборатории и standalone-списки кабинетов.
