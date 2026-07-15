/* lab-homework.js v44 · 2026-07-15 — расширен decorateSections: добавлены section[class*="mission"] (speak-mission/world-mission/school-mission/arcade-mission/booster-mission/passport-mission и др.) и section.grammar-map — покрыты все пропущенные content-секции.
   v43 · 2026-07-15 — кнопка «в домашку» ТОЛЬКО на уровне секции/блока (убраны addBtn вызовы на микро-элементах: .mcq-row/.gap/.wf-row и т.д.). Один «📚 всю секцию в домашку» на блок, без + на каждой фразе.
   v42 2026-07-12 · one-store migration lab-vocab → lab-hw.
   v37 · 2026-07-07 — раскрытие data-back для vocab-card в клоне.
   v37: клон .vocab-card теперь тоже проявляет data-back атрибут — если у карточки
        нет отдельного .vocab-back содержимого, ставим data-back-visible=1 чтоб CSS
        мог показать оборот через ::after. Также — сохраняем figure/figcaption без
        обрезки overflow (Voyager L3 hero-images с overlay-текстом больше не срезаются).
   v36: inline styles background/color стираются на клоне.
   Иначе тёмные inline-фоны с урока (hero, темные секции) уезжали в .raw и создавали
   пустые тёмные прямоугольники поверх кремовой палитры домашки.
   v35 · 2026-07-07 — «Положить в домашку» + event-sourced cloud + чистый клон блока.
   v35: расширен фильтр удаления при клонировании секции — теперь режем:
        .section-hdr, .section-head, .lp-submit, .lp-fab, .lp-toc, .lab-hw-fab,
        .lab-hw-top-entry, .lab-hw-overlay, .lab-hw-modal, script, style, link.
        Плюс `.homework/index.html` получил универсальный `.raw` reset —
        внутренние блоки (word-bank, MCQ, dialog, mic-row) отрисовываются
        в палитре урока, слова больше не слипаются в «languageswatcheschocolate».
   v34: saveHw() теперь дополнительно debounced-пушит snapshot items[] в облако
        (Supabase lab_submissions, section_id='hw-state:<student>'). Каждое +/-
        синхронится через <1c. .homework/index.html подхватывает через SELECT
        latest + Supabase Realtime → живое зеркало. Двусторонность работает:
        Маша в teacher-режиме .homework/?as=teacher&for=<student> добавляет
        задание — ученик видит его в своей корзинке через 1 сек.
        Retry queue localStorage 'lab-hw-cloud-queue' на случай offline.
   v33 · расширены селекторы decorateSections для всех вариантов section-контейнеров.
   У каждого упражнения / секции / блока появляется ➕. Клик добавляет
   элемент в личную домашку ученика.
   v33: расширены селекторы decorateSections до всех вариантов section-контейнеров
        (section.section, section.lab-section, section[id^="block-"|"sec-"|"section-"],
        .lesson-section, .lab-block, .lb-block, section[class*="section-"]) — теперь
        ➕ на каждой секции ЛЮБОГО урока, включая Voyager/Timofey/Practice-архетипы.
        + новые exercise-селекторы для .exercise/.drill/.task/.mic-drill/.timofey-block/.voyager-quest.
   Batch отправка:
     1. INSERT в Supabase lab_submissions (section_id='homework-batch') ← ОСНОВНОЕ
     2. Broadcast в lab-firehose-v1 (teacher-live.html сразу видит)
     3. Опциональный POST в локальный AI Hub (127.0.0.1:8765) для TG-уведомления
        — silent fail если Hub лежит. Hub НЕ основной канал. */
(function(){
  if (window.__labHwLoaded) return;
  window.__labHwLoaded = true;
  // Observer mode (учитель в iframe) — UI домашки виден, но клики silent
  // (не пишут в БД от имени ученика и не broadcast'ят). Учитель ВИДИТ
  // те же кнопки что и ученик, чтобы понимать что у того на экране.
  var observerView = /[?&]observe=/.test(location.search);

  var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function slugify(s){
    return (s||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,30);
  }

  function hwKey(){
    return 'lab-hw:' + location.pathname;
  }
  var HW_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней: хватает на завтра / послезавтра и перенос урока

  /* v42 2026-07-12 · ONE-TIME MIGRATION: старый lab-vocab: (от lab-vocab-saver)
     переливаем в lab-hw: как vocab-items. Раньше слово попадало в два разных
     store через два разных плюсика — дубль. Теперь одна корзина. */
  function migrateLegacyVocab(){
    try {
      var oldKey = 'lab-vocab:' + location.pathname;
      var oldRaw = localStorage.getItem(oldKey);
      if (!oldRaw) return;
      var old = JSON.parse(oldRaw || '[]');
      if (!Array.isArray(old) || !old.length) { localStorage.removeItem(oldKey); return; }
      var hw = JSON.parse(localStorage.getItem(hwKey()) || '[]');
      var seen = {};
      hw.forEach(function(x){
        if (x && x.kind === 'vocab' && x.question) seen[x.question.toLowerCase()] = true;
      });
      old.forEach(function(v){
        var word = (v && v.word || '').trim();
        if (!word) return;
        var q = '📖 ' + word;
        if (seen[q.toLowerCase()]) return;
        hw.push({
          ts: Date.now(),
          kind: 'vocab',
          section_id: 'legacy-vocab',
          section_title: 'Vocabulary',
          question: q,
          correct: (v.ru || '').trim(),
          student_answer: ''
        });
        seen[q.toLowerCase()] = true;
      });
      localStorage.setItem(hwKey(), JSON.stringify(hw));
      localStorage.removeItem(oldKey);
    } catch(e){}
  }
  migrateLegacyVocab();

  function loadHw(){
    try { return JSON.parse(localStorage.getItem(hwKey()) || '[]'); }
    catch(e){ return []; }
  }
  function saveHw(arr){
    try { localStorage.setItem(hwKey(), JSON.stringify(arr)); } catch(e){}
    try {
      refreshFabCount();
      setTimeout(refreshFabCount, 80);
      setTimeout(refreshFabCount, 700);
    } catch(e){}
    // v33+: облачная бетонировка — event-sourced snapshot в lab_submissions
    try { cloudPushHwState(); } catch(e){}
  }
  // v33+: cloud push каждого изменения корзины домашки (debounced).
  // Event-sourcing: каждая новая строка = свежий снимок items[]. Последняя запись = текущее состояние.
  var __cloudPushTimer = null;
  function cloudPushHwState(){
    clearTimeout(__cloudPushTimer);
    __cloudPushTimer = setTimeout(function(){
      try {
        // v41 · 2026-07-09 · раньше `if (!name) return` полностью скипало cloud
        // push для не-идентифицированных сессий → в Supabase 0 записей за день,
        // .homework/ на другом устройстве видит пусто.
        // Теперь fallback на solo-<random> из localStorage (тот же ID что
        // roomFor() генерирует). Ученик до ввода имени всё равно попадает в
        // облако как отдельный анонимный room; когда введёт имя, следующая
        // запись пойдёт под 'homework:<name>' — учитель получит две линии,
        // но обе увидит.
        var name = getName();
        var roomId;
        if (name) {
          roomId = 'student-' + slugify(name);
        } else {
          try {
            var solo = localStorage.getItem('lab-solo-id');
            if (!solo) { solo = 'solo-' + Math.random().toString(36).slice(2,10); localStorage.setItem('lab-solo-id', solo); }
            roomId = solo;
          } catch(e){ roomId = 'solo-anon'; }
        }
        var items = loadHw();
        if (!Array.isArray(items)) return;
        var title = '';
        try { title = (document.title || '').replace(/&middot;/g,'·').split('·')[0].trim(); } catch(e){}
        var payload = {
          room_id: roomId,
          student_role: 'homework:' + (name || 'anonymous'),
          lesson_path: location.pathname,
          section_id: 'hw-state:' + roomId,
          section_title: title || location.pathname,
          score: 0, total: items.length,
          // pct — generated column в БД (score/total*100). Не отправляем.
          misses: items
        };
        fetch(SUPABASE_URL + '/rest/v1/lab_submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON,
            Authorization: 'Bearer ' + SUPABASE_ANON,
            Prefer: 'return=minimal'
          },
          body: JSON.stringify(payload)
        }).catch(function(){
          // тихий retry queue через localStorage
          try {
            var q = JSON.parse(localStorage.getItem('lab-hw-cloud-queue') || '[]');
            q.push(payload);
            if (q.length > 50) q = q.slice(-50);
            localStorage.setItem('lab-hw-cloud-queue', JSON.stringify(q));
          } catch(_){}
        });
      } catch(e){}
    }, 900);
  }
  // Flush queue при загрузке + каждые 20с + on online
  function flushCloudQueue(){
    try {
      var q = JSON.parse(localStorage.getItem('lab-hw-cloud-queue') || '[]');
      if (!q.length || !navigator.onLine) return;
      var head = q[0];
      fetch(SUPABASE_URL + '/rest/v1/lab_submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON, Prefer: 'return=minimal' },
        body: JSON.stringify(head)
      }).then(function(r){
        if (r.ok) { q.shift(); localStorage.setItem('lab-hw-cloud-queue', JSON.stringify(q)); if (q.length) flushCloudQueue(); }
      }).catch(function(){});
    } catch(e){}
  }
  setTimeout(flushCloudQueue, 1500);
  setInterval(flushCloudQueue, 20000);
  window.addEventListener('online', flushCloudQueue);
  // При загрузке урока — если самой свежей записи в домашке больше 48 ч,
  // считаем что ученик уже отыграл прошлый урок и не отправил → чистим.
  // Иначе мамы/ученики шлют скрины со старыми карточками.
  function purgeStale(){
    try {
      var arr = JSON.parse(localStorage.getItem(hwKey()) || '[]');
      if (!arr.length) return;
      var freshest = 0;
      for (var i = 0; i < arr.length; i++) {
        var t = +arr[i].ts || 0;
        if (t > freshest) freshest = t;
      }
      if (freshest && (Date.now() - freshest) > HW_TTL_MS) {
        localStorage.setItem(hwKey(), '[]');
      }
    } catch(e){}
  }
  // TTL на имя: 2 часа.
  // Маша через свой Chrome ведёт уроки с разными учениками подряд —
  // без TTL имя «залипает» (первая Даниэлла остаётся навсегда),
  // и Hub-уведомление приходит от неё для всех.
  var NAME_TTL_MS = 2 * 60 * 60 * 1000;
  function getName(){
    try {
      var raw = localStorage.getItem('lab-student-name');
      if (!raw) return '';
      // legacy: было просто имя строкой
      if (raw[0] !== '{') return raw;
      var data = JSON.parse(raw);
      if (!data.name || !data.ts) return '';
      if (Date.now() - data.ts > NAME_TTL_MS) {
        localStorage.removeItem('lab-student-name');
        return '';
      }
      return data.name;
    } catch(e){ return ''; }
  }
  function setName(name){
    try {
      localStorage.setItem('lab-student-name', JSON.stringify({ name: name, ts: Date.now() }));
    } catch(e){}
  }
  function roomFor(name){
    return name ? 'student-' + slugify(name) : (function(){
      try {
        var stored = localStorage.getItem('lab-solo-id');
        if (!stored) { stored = 'solo-' + Math.random().toString(36).slice(2,10); localStorage.setItem('lab-solo-id', stored); }
        return stored;
      } catch(e){ return 'solo-anon'; }
    })();
  }

  function injectStyle(){
    if (document.getElementById('lab-hw-style')) return;
    var s = document.createElement('style');
    s.id = 'lab-hw-style';
    s.textContent = ''+
      '.lab-hw-add{position:absolute;top:4px;right:4px;left:auto;width:26px;height:26px;border-radius:50%;'+
        'background:linear-gradient(135deg,#fff 0%,#fef3c7 100%);'+
        'border:1.5px solid #f59e0b;color:#92400e;cursor:pointer;'+
        'display:inline-flex;align-items:center;justify-content:center;'+
        'font:800 16px/1 system-ui;box-shadow:0 2px 6px rgba(245,158,11,.18);'+
        'opacity:0;transform:scale(.85);transition:all .18s ease-out;z-index:5}'+
      '.lab-hw-host{position:relative}'+
      '.lab-hw-host:hover .lab-hw-add,.lab-hw-add.added{opacity:1;transform:scale(1)}'+
      /* На touch-устройствах нет hover — плюсики всегда видны (mobile/tablet) */
      '@media (hover:none){.lab-hw-add{opacity:1;transform:scale(1)}}'+
      /* В учительском режиме — все плюсики ВСЕГДА видны */
      'body.lab-teacher-on .lab-hw-add{opacity:1;transform:scale(1)}'+
      'body.lab-teacher-on .lab-hw-add:hover{transform:scale(1.12);background:#f59e0b;color:#fff}'+
      '.lab-hw-section-btn{padding:8px 14px;border-radius:50px;border:1.5px solid #f59e0b;'+
        'background:#fff;color:#92400e;cursor:pointer;'+
        'font:800 11px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;'+
        'display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all .15s;'+
        'box-sizing:border-box;max-width:100%;white-space:normal;text-align:center;line-height:1.2;margin:14px auto 0}'+
      '.lab-hw-section-btn:hover{background:#f59e0b;color:#fff;transform:translateY(-1px)}'+
      '.lab-hw-add:hover{background:#f59e0b;color:#fff;box-shadow:0 4px 14px rgba(245,158,11,.42);transform:scale(1.08)}'+
      '.lab-hw-add.added{background:linear-gradient(135deg,#fde68a 0%,#fbbf24 100%);color:#78350f}'+
      '.lab-hw-add.added::after{content:""}'+
      '[data-lab-theme="dark"] .lab-hw-add{background:linear-gradient(135deg,#3a2f1a 0%,#4d3d1f 100%);color:#fde68a;border-color:#92400e}'+
      '[data-lab-theme="dark"] .lab-hw-add.added{background:#92400e;color:#fef3c7}'+

      '.lab-hw-fab{position:fixed;right:18px;bottom:150px;z-index:998}'+
      '.lab-hw-fab-btn{padding:11px 18px;border-radius:50px;border:0;cursor:pointer;'+
        'background:linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%);color:#fff;'+
        'font:800 11px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;'+
        'box-shadow:0 8px 24px rgba(245,158,11,.45);display:flex;align-items:center;gap:8px;'+
        'transition:transform .15s,box-shadow .15s;min-height:42px;box-sizing:border-box}'+
      '.lab-hw-fab-btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(245,158,11,.55)}'+
      '.lab-hw-fab-btn .n{background:#fff;color:#92400e;padding:2px 10px;border-radius:50px;'+
        'font:900 13px/1 "JetBrains Mono",monospace}'+
      '.lab-hw-fab.empty .lab-hw-fab-btn{background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);opacity:.9;'+
        'box-shadow:0 6px 18px rgba(245,158,11,.35)}'+
      '.lab-hw-fab.empty .n{color:#92400e}'+
      '.lab-hw-fab.is-top-tab-proxy{width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;'+
        'right:auto;bottom:auto;left:-9999px;top:auto}'+
      '.lab-hw-top-entry{position:fixed;right:18px;top:74px;z-index:1001;display:flex}'+
      '.lab-hw-top-entry-btn{border:1px solid rgba(245,158,11,.45);border-radius:999px;'+
        'background:linear-gradient(135deg,#fff7d6,#fbbf24);color:#78350f;cursor:pointer;'+
        'font:900 11px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;'+
        'padding:10px 13px;box-shadow:0 8px 24px rgba(245,158,11,.28);display:inline-flex;align-items:center;gap:8px}'+
      '.lab-hw-top-entry-btn .n{background:#fff;color:#78350f;padding:2px 8px;border-radius:999px}'+
      '.lab-hw-top-entry.empty .lab-hw-top-entry-btn{filter:saturate(.72);opacity:.82}'+
      '#ltab-hw-count,.ltab-count{display:inline-flex!important;align-items:center;justify-content:center;min-width:20px;'+
        'padding:2px 7px;border-radius:999px;background:var(--accent,#34d88a);color:var(--accent-on,#062215);font-weight:900}'+
      '@media (max-width:680px){.lab-hw-fab{right:max(10px,env(safe-area-inset-right));bottom:96px;max-width:calc(100vw - 20px)}'+
        '.lab-hw-fab-btn{max-width:calc(100vw - 20px);min-height:38px;padding:9px 12px;font-size:10px;letter-spacing:.08em;white-space:normal;text-align:center;line-height:1.15;justify-content:center}'+
        '.lab-hw-top-entry{top:62px;right:10px;max-width:calc(100vw - 20px)}'+
        '.lab-hw-top-entry-btn{padding:9px 11px;font-size:10px;letter-spacing:.06em}'+
        '.lab-hw-section-btn{padding:7px 10px;font-size:9.5px;letter-spacing:.06em;max-width:100%}}'+

      '.lab-hw-overlay{position:fixed;inset:0;background:rgba(20,15,40,.62);'+
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'+
        'z-index:99996;display:none;align-items:center;justify-content:center;padding:20px}'+
      '.lab-hw-overlay.show{display:flex;animation:labHwFade .25s ease-out}'+
      '@keyframes labHwFade{from{opacity:0}to{opacity:1}}'+
      '.lab-hw-modal{background:#fff;border-radius:20px;max-width:640px;width:100%;max-height:86vh;'+
        'display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.32);'+
        'font-family:"Manrope",sans-serif;color:#1a1f2e}'+
      '[data-lab-theme="dark"] .lab-hw-modal{background:#1b1626;color:#f3eee5}'+
      '.lab-hw-modal-h{padding:22px 26px 12px;border-bottom:1px solid rgba(0,0,0,.08);'+
        'display:flex;justify-content:space-between;align-items:flex-start;gap:12px}'+
      '[data-lab-theme="dark"] .lab-hw-modal-h{border-color:rgba(255,255,255,.08)}'+
      '.lab-hw-modal-h h3{margin:0;font:800 1.4rem/1.2 "Manrope",sans-serif;color:#92400e}'+
      '[data-lab-theme="dark"] .lab-hw-modal-h h3{color:#fbbf24}'+
      '.lab-hw-modal-h .sub{font:500 .85rem/1.4 "Manrope",sans-serif;color:#64748b;margin-top:4px}'+
      '.lab-hw-close{background:transparent;border:0;font-size:28px;cursor:pointer;color:#64748b;'+
        'line-height:1;padding:0;width:34px;height:34px;border-radius:50%}'+
      '.lab-hw-close:hover{background:rgba(0,0,0,.06)}'+
      '[data-lab-theme="dark"] .lab-hw-close{color:#94a3b8}'+
      '.lab-hw-list{flex:1;overflow-y:auto;padding:14px 26px}'+
      '.lab-hw-item{background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);'+
        'border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:10px;'+
        'padding:14px 16px;margin-bottom:10px;position:relative}'+
      '[data-lab-theme="dark"] .lab-hw-item{background:linear-gradient(135deg,#2e2419 0%,#3d2f1c 100%);'+
        'border-color:#78350f}'+
      '.lab-hw-item .lab-hw-kind{display:inline-block;font:800 .68rem/1 "JetBrains Mono",monospace;'+
        'letter-spacing:.16em;text-transform:uppercase;color:#92400e;background:#fde68a;'+
        'padding:3px 8px;border-radius:50px;margin-bottom:6px}'+
      '[data-lab-theme="dark"] .lab-hw-item .lab-hw-kind{color:#fbbf24;background:#451a03}'+
      '.lab-hw-item .lab-hw-q{font:700 .96rem/1.45 "Manrope",sans-serif;margin-bottom:4px}'+
      '.lab-hw-item .lab-hw-meta{font:500 .82rem/1.5 "Manrope",sans-serif;color:#78350f}'+
      '[data-lab-theme="dark"] .lab-hw-item .lab-hw-meta{color:#d4a373}'+
      '.lab-hw-item .lab-hw-meta b{color:#1a1f2e}'+
      '[data-lab-theme="dark"] .lab-hw-item .lab-hw-meta b{color:#fef3c7}'+
      '.lab-hw-item .lab-hw-rm{position:absolute;top:8px;right:8px;width:24px;height:24px;'+
        'border-radius:50%;background:transparent;border:0;color:#92400e;cursor:pointer;font-size:18px;line-height:1}'+
      '.lab-hw-item .lab-hw-rm:hover{background:rgba(146,64,14,.12)}'+
      '.lab-hw-empty{text-align:center;padding:40px 20px;color:#64748b;'+
        'font:500 .95rem/1.5 "Manrope",sans-serif}'+
      '.lab-hw-empty .em{font-size:48px;display:block;margin-bottom:12px}'+
      '.lab-hw-modal-f{padding:16px 26px 22px;border-top:1px solid rgba(0,0,0,.08);'+
        'display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}'+
      '[data-lab-theme="dark"] .lab-hw-modal-f{border-color:rgba(255,255,255,.08)}'+
      '.lab-hw-modal-f button{padding:11px 18px;border-radius:10px;border:0;cursor:pointer;'+
        'font:800 .82rem/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;'+
        'transition:transform .15s,box-shadow .15s}'+
      '.lab-hw-modal-f .lab-hw-send{background:linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%);color:#fff}'+
      '.lab-hw-modal-f .lab-hw-send:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(245,158,11,.42)}'+
      '.lab-hw-modal-f .lab-hw-send:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}'+
      '.lab-hw-modal-f .lab-hw-clear{background:transparent;color:#dc2626;border:1.5px solid #fecaca}'+
      '.lab-hw-modal-f .lab-hw-clear:hover{background:#fef2f2}'+
      '.lab-hw-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);'+
        'background:#92400e;color:#fff;padding:12px 22px;border-radius:50px;'+
        'font:700 .88rem/1.4 "Manrope",sans-serif;z-index:99999;'+
        'box-shadow:0 8px 30px rgba(0,0,0,.32);opacity:0;transition:opacity .2s;pointer-events:none}'+
      '.lab-hw-toast.show{opacity:1}';
    document.head.appendChild(s);
  }

  function toast(msg){
    var t = document.querySelector('.lab-hw-toast');
    if (!t) { t = document.createElement('div'); t.className = 'lab-hw-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(function(){ t.classList.add('show'); });
    clearTimeout(t.__tt);
    t.__tt = setTimeout(function(){ t.classList.remove('show'); }, 2800);
  }

  function txt(el){ return el ? (el.textContent || '').replace(/\s+/g,' ').trim() : ''; }
  function nodeFingerprint(node){
    var raw = ((node && node.outerHTML) || txt(node) || '').slice(0, 1200);
    var h = 0;
    for (var i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }
  function short(s, n){ s = s||''; return s.length > n ? s.slice(0, n-1) + '…' : s; }

  // Описать упражнение в формате item для домашки
  function describe(host, kind){
    var sec = host.closest('section.section') || host.closest('section');
    var secTitle = (sec && (sec.querySelector('h2')?.textContent || sec.querySelector('h3')?.textContent) || '').trim();
    var item = {
      ts: Date.now(),
      kind: kind,
      section_id: sec ? (sec.id || '') : '',
      section_title: short(secTitle, 100),
      question: '',
      correct: '',
      student_answer: ''
    };
    if (kind === 'mcq') {
      var qEl = host.querySelector('.mcq-q, .mc-q, .stmt, .ctx');
      item.question = short(txt(qEl), 200);
      var right = host.querySelector('.mcq-opts button.correct, .mc-opts button.correct, button.right');
      if (right) item.correct = short(txt(right), 120);
      var clicked = host.querySelector('.mcq-opts button.wrong, .mc-opts button.wrong, button.wrong');
      if (clicked) item.student_answer = short(txt(clicked), 120);
    } else if (kind === 'tfns') {
      item.question = short(txt(host.querySelector('.stmt')), 200);
      var rT = host.querySelector('button.right');
      if (rT) item.correct = short(txt(rT), 80);
      var wT = host.querySelector('button.wrong');
      if (wT) item.student_answer = short(txt(wT), 80);
    } else if (kind === 'gap') {
      var ctx = host.closest('p, li, .gapfill, .cloze, .card');
      item.question = short(txt(ctx), 200);
      item.correct = short(host.dataset.answer || host.dataset.ans || '', 80);
      item.student_answer = short((host.textContent || '').trim(), 80);
    } else if (kind === 'wf') {
      var ctxEl = host.querySelector('.ctx');
      item.question = short(txt(ctxEl), 200);
      var inp = host.querySelector('input');
      if (inp) {
        item.correct = short(inp.dataset.answer || txt(host.querySelector('.hint')), 80);
        item.student_answer = short(inp.value || '', 80);
      }
    } else if (kind === 'match') {
      item.question = short(txt(host), 200);
      item.correct = short(host.dataset.answer || '', 80);
    } else if (kind === 'builder') {
      var prompt = host.querySelector('.target-line, .prompt');
      item.question = short(txt(prompt), 200);
      item.correct = short(host.dataset.answer || '', 200);
    } else if (kind === 'mic') {
      item.question = short(host.dataset.target || txt(host.querySelector('.mic-text')), 200);
      item.correct = short(host.dataset.target || '', 200);
      var tr = host.querySelector('.mic-transcript');
      if (tr) item.student_answer = short((tr.textContent || '').replace(/^"|"$/g,'').trim(), 200);
    } else if (kind === 'writing') {
      var label = host.previousElementSibling;
      item.question = short(txt(label) || 'Open writing', 200);
      item.student_answer = short(host.value || '', 500);
    } else if (kind === 'vocab') {
      var word = host.dataset.word || (host.querySelector('.word, .vocab-word, .term, .vocab-front .word, .front')?.textContent || '').trim();
      var meaning = (host.querySelector('.meaning, .vocab-back .meaning')?.textContent || '').trim();
      var example = (host.querySelector('.ex, .vocab-back .ex')?.textContent || '').trim();
      item.question = short('📖 ' + word, 200);
      item.correct = short(meaning, 200);
      item.student_answer = short(example, 200);
    }
    return item;
  }

  function cleanRawClone(node){
    var clone = node.cloneNode(true);
    if (clone.classList) clone.classList.remove('lab-hw-host');
    clone.querySelectorAll('.lab-hw-add, .lab-hw-section-btn, .lab-hw-fab, .lab-hw-top-entry, .lab-hw-overlay, .lab-hw-modal, script, style, link[rel="stylesheet"]').forEach(function(el){ el.remove(); });
    // 2026-07-08: мандат Марии — клон 1-в-1 с уроком. Сузили blacklist,
    // раньше [class*="model"] вырезал .tr-model / .model-card (steal-a-phrase
    // модели ответа для warm-up), [class*="reveal"] уничтожал info panels,
    // [class*="listen-script"] / [class*="transcript"] удаляли listen script урока.
    // Теперь удаляем только явные учительские ключи и .details.teacher.
    clone.querySelectorAll('details.teacher, .teacher, .t-body, .score-badge.tutor, .answer-key, [class*="answer-key"], .correct-answer, [class*="correct-answer"], details.solution, details.reveal, details.model-answer').forEach(function(el){ el.remove(); });
    clone.querySelectorAll('.lab-hw-host').forEach(function(el){ el.classList.remove('lab-hw-host'); });
    clone.querySelectorAll('[style]').forEach(function(el){
      var s = el.getAttribute('style') || '';
      // 1-в-1 mandate — inline background / color больше не режем.
      // Но убираем фиксированные пиксельные width/max-width/min-width (они из lesson-layout-context, ломают домашку)
      s = s.replace(/\b(?:width|max-width|min-width)\s*:[^;]*\d+px[^;]*(?:!important\s*)?;?\s*/gi, '');
      s = s.replace(/^\s*;+/, '').replace(/;+\s*$/, '');
      if (s.trim()) el.setAttribute('style', s);
      else el.removeAttribute('style');
    });
    clone.querySelectorAll('[src]').forEach(function(el){
      var value = el.getAttribute('src') || '';
      if (value && !/^(https?:|data:|\/)/i.test(value)) {
        try { el.setAttribute('src', new URL(value, location.href).pathname); } catch(e){}
      }
    });
    clone.querySelectorAll('[href]').forEach(function(el){
      var value = el.getAttribute('href') || '';
      if (value && !/^(https?:|mailto:|tel:|#|\/)/i.test(value)) {
        try { el.setAttribute('href', new URL(value, location.href).pathname); } catch(e){}
      }
    });
    return clone;
  }

  function rawHomeworkItem(host, kind){
    var item = describe(host, kind);
    var title = txt(host.querySelector('h3, h4, .mcq-q, .mc-q, .tf-q, .predict-q, .prompt-text, .line-q, .quiz-q, .stmt, .vocab-word, .word, .term, .front, .vocab-front')) || item.question || item.section_title || 'Задание';
    title = (title || '').replace(/\s*\+\s*$/, '').trim();
    item.kind = 'raw-block';
    item.question = short(title, 180);
    item.html = cleanRawClone(host).outerHTML;
    item.section_id = (item.section_id || 'raw') + ':' + (kind || 'block') + ':' + nodeFingerprint(host);
    item.css = '';
    return item;
  }

  function addBtn(host, kind){
    if (host.__hwHost) return;
    host.__hwHost = true;
    host.__hwKind = kind;
    host.classList.add('lab-hw-host');
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'lab-hw-add';
    b.textContent = '+';
    b.title = 'Положить в домашку';
    b.addEventListener('mousedown', function(e){ e.preventDefault(); e.stopPropagation(); }, true);
    b.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var item = rawHomeworkItem(host, kind);
      var arr = loadHw();
      // защита от дубля — по section_id + question
      var dupIdx = arr.findIndex(function(x){
        return x.section_id === item.section_id && x.question === item.question && x.kind === item.kind;
      });
      if (dupIdx >= 0) {
        arr.splice(dupIdx, 1);
        b.classList.remove('added');
        b.textContent = '+';
        toast('Убрала из домашки');
      } else {
        arr.push(item);
        b.classList.add('added');
        b.textContent = '✓';
        toast('Добавила в домашку · ' + arr.length);
      }
      saveHw(arr);
      refreshFabCount();
    });
    // Если уже в hw — отметить ✓
    var item = rawHomeworkItem(host, kind);
    if (loadHw().some(function(x){
      return x.section_id === item.section_id && x.question === item.question && x.kind === item.kind;
    })) {
      b.classList.add('added');
      b.textContent = '✓';
    }
    host.appendChild(b);
  }

  function scanAndDecorate(){
    // v43: кнопка «в домашку» только на уровне секции/блока.
    // addBtn() на микро-элементах (.mcq-row/.gap/.wf-row и т.д.) убран —
    // иначе + рисовался на каждой отдельной фразе/строке.
    decorateSections();
  }

  // Кнопка «📚 весь блок в домашку» на каждой секции
  function decorateSections(){
    document.querySelectorAll('section.section, section.lab-section, section.lesson-section, section.block, section.canon-l-section, section[class*="section-"], section[id^="block-"], section[id^="block"], section[id^="sec-"], section[id^="sec"], section[id^="section-"], section[id^="b"][id$="1"], section[id^="b"][id$="2"], section[id^="b"][id$="3"], section[id^="b"][id$="4"], section[id^="b"][id$="5"], section[id^="b"][id$="6"], section[id^="b"][id$="7"], section[id^="b"][id$="8"], section[id^="b"][id$="9"], section[class*="mission"], section.grammar-map, .lesson-section, .lab-block, .lb-block').forEach(function(sec){
      if (sec.__hwSecBtn) return;
      sec.__hwSecBtn = true;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lab-hw-section-btn';
      btn.innerHTML = '📚 всю секцию в домашку';
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        var allSections = Array.prototype.slice.call(document.querySelectorAll('section.section, section.lab-section, section.lesson-section, section.block, section.canon-l-section, section[class*="section-"], section[id^="block-"], section[id^="block"], section[id^="sec-"], section[id^="sec"], section[id^="section-"], section[id^="b"][id$="1"], section[id^="b"][id$="2"], section[id^="b"][id$="3"], section[id^="b"][id$="4"], section[id^="b"][id$="5"], section[id^="b"][id$="6"], section[id^="b"][id$="7"], section[id^="b"][id$="8"], section[id^="b"][id$="9"], .lesson-section, .lab-block, .lb-block'));
        var sectionIndex = allSections.indexOf(sec) + 1;
        var sectionId = sec.id || sec.getAttribute('data-hw-section-id') || ('section-' + sectionIndex);
        sec.setAttribute('data-hw-section-id', sectionId);
        var titleEl = sec.querySelector('.section-hdr h2, .section-head h2, h2, h3');
        var sectionTitle = short(txt(titleEl) || ('Section ' + sectionIndex), 120);
        var clone = sec.cloneNode(true);
        var lessonStyle = Array.prototype.slice.call(document.querySelectorAll('style')).map(function(style){
          return style.textContent || '';
        }).join('\n');
        // 2026-07-08: мандат 1-в-1. Больше не режем .section-hdr / .section-head
        // (нужны для section-num badge и section-sub instruction). Режем ТОЛЬКО
        // UI-мусор урока (add кнопки, task-tags, samotek-маркеры).
        clone.querySelectorAll('.lab-hw-add, .lab-hw-section-btn, .lp-submit, .lp-fab, .lp-toc, .lp-task-tag, .task-tag, .task-boundary, .pilot-tag, [class*="lp-task-tag"], [class*="samotek"], .lab-hw-fab, .lab-hw-top-entry, .lab-hw-overlay, .lab-hw-modal, script, style, link[rel="stylesheet"]').forEach(function(node){ node.remove(); });
        // Сужен blacklist: только явные учительские ключи, .model-card / .tr-model /
        // .listen-script / .transcript теперь ОСТАЮТСЯ (Voyager model steal-phrase
        // panel + listen script для warm-up), Мария хочет видеть их в домашке.
        clone.querySelectorAll('details.teacher, .teacher, .t-body, .score-badge.tutor, .answer-key, [class*="answer-key"], .correct-answer, [class*="correct-answer"], details.solution, details.reveal, details.model-answer').forEach(function(node){ node.remove(); });
        // 2026-07-08 мандат 1-в-1: text/button-based blacklist убран.
        // Model answer / sample model / listen script — часть контента урока,
        // Мария хочет их в домашке. Только явные учительские "показать ответ"
        // remain-режим больше не срабатывает.
        // Inline background/color тоже больше НЕ стираем — иначе теряется свой
        // фон карточки урока, а Мария просит "выглядит абсолютно как в уроке".
        clone.querySelectorAll('[style]').forEach(function(el){
          var s = el.getAttribute('style') || '';
          // v43: strip fixed-pixel width/max-width/min-width (set by lesson JS for lesson layout context, breaks homework)
          s = s.replace(/\b(?:width|max-width|min-width)\s*:[^;]*\d+px[^;]*(?:!important\s*)?;?\s*/gi, '');
          s = s.replace(/^\s*;+/, '').replace(/;+\s*$/, '');
          if (s.trim()) el.setAttribute('style', s);
          else el.removeAttribute('style');
        });
        clone.querySelectorAll('.tfns-row, .tf-row, .tf-item, .match-item, .match-card, .match-row, [class*="tfns-"], [class*="match-"]').forEach(function(el){
          el.hidden = false;
          el.removeAttribute('hidden');
          el.removeAttribute('aria-hidden');
          el.removeAttribute('inert');
          el.classList.remove('hidden', 'is-hidden', 'collapsed', 'is-collapsed');
        });
        clone.querySelectorAll('.lab-hw-host').forEach(function(el){
          el.classList.remove('lab-hw-host');
        });
        clone.querySelectorAll('.flip-card[data-en]').forEach(function(card){
          var en = card.getAttribute('data-en') || '';
          var pos = card.getAttribute('data-pos') || '';
          var ru = card.getAttribute('data-ru') || '';
          var def = card.getAttribute('data-def') || '';
          card.innerHTML =
            '<div class="flip-inner">' +
              '<div class="flip-front">' +
                '<span class="word">' + escapeHTML(en) + '</span>' +
                (pos ? '<span class="pos">' + escapeHTML(pos) + '</span>' : '') +
              '</div>' +
              '<div class="flip-back">' +
                (ru ? '<span class="ru">' + escapeHTML(ru) + '</span>' : '') +
                (def ? '<span class="ex">' + escapeHTML(def) + '</span>' : '') +
              '</div>' +
            '</div>';
        });
        clone.querySelectorAll('[src]').forEach(function(node){
          var value = node.getAttribute('src') || '';
          if (value && !/^(https?:|data:|\/)/i.test(value)) {
            try { node.setAttribute('src', new URL(value, location.href).pathname); } catch(e){}
          }
        });
        clone.querySelectorAll('[href]').forEach(function(node){
          var value = node.getAttribute('href') || '';
          if (value && !/^(https?:|mailto:|tel:|#|\/)/i.test(value)) {
            try { node.setAttribute('href', new URL(value, location.href).pathname); } catch(e){}
          }
        });
        var blockItem = {
          kind: 'raw-block',
          section_id: sectionId,
          section_title: sectionTitle,
          question: sectionTitle,
          css: lessonStyle,
          html: clone.outerHTML,
          student_answer: '',
          ts: Date.now()
        };
        var blockArr = loadHw();
        var blockIdx = blockArr.findIndex(function(x){ return x.kind === 'raw-block' && x.section_id === blockItem.section_id; });
        if (blockIdx >= 0) {
          blockArr.splice(blockIdx, 1);
          btn.classList.remove('added');
          toast('Убрала блок из домашки');
        } else {
          blockArr.push(blockItem);
          btn.classList.add('added');
          toast('Блок добавлен в домашку');
        }
        saveHw(blockArr);
        refreshFabCount();
        return;
        var items = sec.querySelectorAll('.lab-hw-host');
        // FALLBACK: если по типам ничего не нашлось — кладём всю секцию как RAW HTML блок
        if (!items.length) {
          var arrRaw = loadHw();
          var clone = sec.cloneNode(true);
          // убрать кнопки хомяка из клона
          clone.querySelectorAll('.lab-hw-add, .lab-hw-section-btn').forEach(function(b){ b.remove(); });
          var rawItem = {
            kind: 'raw-block',
            section_id: sec.id || ('sec-' + Date.now()),
            question: (sec.querySelector('h1, h2, h3') || {}).textContent || 'Block',
            html: clone.outerHTML,
            ts: Date.now()
          };
          var dupRaw = arrRaw.some(function(x){ return x.section_id === rawItem.section_id && x.kind === 'raw-block'; });
          if (!dupRaw) { arrRaw.push(rawItem); saveHw(arrRaw); refreshFabCount(); toast('📦 секция целиком — в домашку'); }
          else { toast('Этот блок уже в домашке'); }
          return;
        }
        var arr = loadHw();
        var added = 0;
        items.forEach(function(host){
          var kind = host.__hwKind || '';
          if (!kind) {
            if (host.matches('.mcq-row, .mc-item, .choice-row, .choice-card, .qcard, .question-card, .q-item, .mc1-row, .pv-mcq-row, .q-row')) kind='mcq';
            else if (host.matches('.tfns-row, .tf-row, .tf-item')) kind='tfns';
            else if (host.matches('.gap, .gram-gap, .gapfill, .cloze-gap, .lex-gap, .pv-gap, .cloze-row, .oc-row')) kind='gap';
            else if (host.matches('.wf-row, .wordform-row')) kind='wf';
            else if (host.matches('.match-item, .match-card, .match-row, .pair-row')) kind='match';
            else if (host.matches('.builder, .reorder-row, .order-row')) kind='builder';
            else if (host.matches('.mic-row, .speech-row, .speak-row')) kind='mic';
            else if (host.matches('textarea')) kind='writing';
            else if (host.matches('.vocab-card, .word-card, .vocabulary-item, .flip-card')) kind='vocab';
            else if (host.matches('.dict-row, .dictation-row')) kind='gap';
            else if (host.matches('.trans-row, .transform-row, .rewrite-row, .tr-row')) kind='builder';
            else if (host.matches('.cue-card, .post, .prompt-card, .task-card, .speaking-task, .writing-task')) kind='builder';
            else kind='other';
          }
          var item = describe(host, kind);
          var dup = arr.some(function(x){ return x.section_id===item.section_id && x.question===item.question && x.kind===item.kind; });
          if (!dup) { arr.push(item); added++; }
        });
        saveHw(arr);
        refreshFabCount();
        items.forEach(function(host){
          var b = host.querySelector('.lab-hw-add');
          if (b) { b.classList.add('added'); b.textContent = '✓'; }
        });
        toast('📚 ' + added + ' заданий из секции — в домашку');
        // BROADCAST ученику — двусторонняя секция
        try {
          var freshItems = [];
          items.forEach(function(host){
            var kind = host.__hwKind || 'other';
            freshItems.push(describe(host, kind));
          });
          if (!window.supabase) return;
          var c = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
          var ch = c.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
          ch.subscribe(function(s){
            if (s === 'SUBSCRIBED') {
              ch.send({ type:'broadcast', event:'homework-section-push', payload: {
                lesson_path: location.pathname,
                section_id: sec.id || '',
                items: freshItems, ts: Date.now()
              }});
              setTimeout(function(){ ch.unsubscribe(); }, 700);
            }
          });
        } catch(e){}
      });
      // Размещение: после section-head или в начале секции
      var initialSections = Array.prototype.slice.call(document.querySelectorAll('section.section, section.lab-section, section.lesson-section, section.block, section.canon-l-section, section[class*="section-"], section[id^="block-"], section[id^="block"], section[id^="sec-"], section[id^="sec"], section[id^="section-"], section[id^="b"][id$="1"], section[id^="b"][id$="2"], section[id^="b"][id$="3"], section[id^="b"][id$="4"], section[id^="b"][id$="5"], section[id^="b"][id$="6"], section[id^="b"][id$="7"], section[id^="b"][id$="8"], section[id^="b"][id$="9"], .lesson-section, .lab-block, .lb-block'));
      var initialIndex = initialSections.indexOf(sec) + 1;
      var initialSectionId = sec.id || sec.getAttribute('data-hw-section-id') || ('section-' + initialIndex);
      sec.setAttribute('data-hw-section-id', initialSectionId);
      if (loadHw().some(function(x){ return x.kind === 'raw-block' && x.section_id === initialSectionId; })) {
        btn.classList.add('added');
      }
      var head = sec.querySelector('.section-head, .section-hdr');
      if (head) {
        head.style.position = head.style.position || 'relative';
        btn.style.cssText = 'margin-top:8px;display:inline-flex';
        head.appendChild(btn);
      } else {
        btn.style.cssText = 'display:inline-flex;margin:10px 0';
        sec.insertBefore(btn, sec.firstChild);
      }
    });
  }

  var fabEl = null, topEntryEl = null, overlayEl = null;

  function refreshFabCount(){
    var n = loadHw().length;
    if (fabEl) {
      var btn = fabEl.querySelector('.lab-hw-fab-btn');
      if (btn && btn.querySelector('.n')) btn.querySelector('.n').textContent = n;
      fabEl.classList.toggle('empty', n === 0);
    }
    if (topEntryEl) {
      var topBtn = topEntryEl.querySelector('.lab-hw-top-entry-btn');
      if (topBtn && topBtn.querySelector('.n')) topBtn.querySelector('.n').textContent = n;
      topEntryEl.classList.toggle('empty', n === 0);
    }
    document.querySelectorAll('.lab-hw-fab .n, .lab-hw-top-entry .n, #ltab-hw-count, .ltab-count').forEach(function(el){
      el.textContent = n;
      el.style.display = 'inline-flex';
      el.hidden = false;
    });
  }

  function buildFab(){
    fabEl = document.createElement('div');
    // Всегда скрыт: домашка живёт СВЕРХУ (native tab / standalone entry).
    // FAB остаётся техпрокси для счётчиков — Мария 2026-07-02 подтвердила
    // «убрать нижнюю жёлтую» после первой раскатки.
    fabEl.className = 'lab-hw-fab empty is-top-tab-proxy';
    fabEl.innerHTML =
      '<button type="button" class="lab-hw-fab-btn">'+
        '<span>📚 Моя домашка</span><span class="n">0</span>'+
      '</button>';
    document.body.appendChild(fabEl);
    fabEl.querySelector('button').addEventListener('click', openHomeworkPage);
  }

  function buildTopEntry(){
    var nativeTab = document.querySelector('.lesson-tabs [data-tab="homework"], [data-lab-homework-top]');
    if (nativeTab) {
      if (!nativeTab.querySelector('.n, .ltab-count')) {
        nativeTab.insertAdjacentHTML('beforeend', ' <span class="ltab-count n">0</span>');
      }
      if (!nativeTab.__labHwTopBound) {
        nativeTab.__labHwTopBound = true;
        nativeTab.addEventListener('click', function(e){
          e.preventDefault();
          openHomeworkPage();
        });
      }
      topEntryEl = nativeTab;
      return;
    }
    var tabs = document.querySelector('.lesson-tabs');
    if (tabs) {
      topEntryEl = document.createElement('button');
      topEntryEl.type = 'button';
      topEntryEl.className = 'ltab lab-hw-top-tab';
      topEntryEl.setAttribute('data-tab', 'homework');
      topEntryEl.setAttribute('data-lab-homework-top', '');
      topEntryEl.innerHTML = '📚 Моя домашка <span class="ltab-count n">0</span>';
      topEntryEl.addEventListener('click', function(e){
        e.preventDefault();
        openHomeworkPage();
      });
      tabs.appendChild(topEntryEl);
      return;
    }
    topEntryEl = document.createElement('div');
    topEntryEl.className = 'lab-hw-top-entry empty';
    topEntryEl.innerHTML =
      '<button type="button" class="lab-hw-top-entry-btn" data-lab-homework-top>'+
        '<span>📚 Моя домашка</span><span class="n">0</span>'+
      '</button>';
    document.body.appendChild(topEntryEl);
    topEntryEl.querySelector('button').addEventListener('click', openHomeworkPage);
  }

  function openHomeworkPage(){
    // v42+ · передаём theme в .homework/ чтобы палитра совпала с уроком.
    // Раньше .homework/ дефолтил на тёмную палитру, светлые уроки выглядели
    // криво (vocab-card на #061428 фоне).
    var theme = new URLSearchParams(location.search).get('theme')
                || document.documentElement.getAttribute('data-theme')
                || 'light-lab';
    window.location.href = '/lingua-boost-lab/.homework/?lesson=' + encodeURIComponent(location.pathname) + '&theme=' + encodeURIComponent(theme);
  }

  function kindLabel(k){
    return ({mcq:'Тест',tfns:'True / False / NS',gap:'Пропуск',wf:'Word formation',match:'Match',builder:'Sentence',mic:'Speaking',writing:'Writing',vocab:'Слово'}[k] || k);
  }

  function renderList(){
    var list = overlayEl.querySelector('.lab-hw-list');
    var arr = loadHw();
    var sendBtn = overlayEl.querySelector('.lab-hw-send');
    var clearBtn = overlayEl.querySelector('.lab-hw-clear');
    if (!arr.length) {
      list.innerHTML = '<div class="lab-hw-empty"><span class="em">📭</span>Пока ничего не положили в домашку.<br>Жми кнопку <strong>+</strong> у заданий которые хочешь повторить.</div>';
      sendBtn.disabled = true;
      clearBtn.style.display = 'none';
      return;
    }
    sendBtn.disabled = false;
    clearBtn.style.display = '';
    list.innerHTML = arr.map(function(it, i){
      // RAW-BLOCK: показываем целиком HTML секции
      if (it.kind === 'raw-block' && it.html) {
        return '<div class="lab-hw-item" data-i="'+i+'" style="padding:0;overflow:hidden">'+
          '<button type="button" class="lab-hw-rm" title="Убрать" style="position:absolute;top:8px;right:8px;z-index:2">×</button>'+
          '<span class="lab-hw-kind" style="position:absolute;top:8px;left:8px;z-index:2">📦 целая секция</span>'+
          '<div class="lab-hw-raw" style="max-height:520px;overflow:auto;padding:36px 14px 14px;background:#fff;border-radius:8px">'+
            it.html +
          '</div>'+
        '</div>';
      }
      var lines = [];
      var isVocab = it.kind === 'vocab';
      var qText = it.question || '(без вопроса)';
      if (isVocab && it.correct && qText.indexOf(' — ') === -1) {
        qText = qText + ' — ' + it.correct;
      }
      if (it.section_title) lines.push('<div class="lab-hw-meta"><b>Раздел:</b> '+escapeHTML(it.section_title)+'</div>');
      if (isVocab) {
        if (it.correct) lines.push('<div class="lab-hw-meta"><b>Перевод:</b> '+escapeHTML(it.correct)+'</div>');
        if (it.student_answer) lines.push('<div class="lab-hw-meta"><b>Пример:</b> '+escapeHTML(it.student_answer)+'</div>');
      } else {
        if (it.correct) lines.push('<div class="lab-hw-meta"><b>Правильный ответ:</b> '+escapeHTML(it.correct)+'</div>');
        if (it.student_answer) lines.push('<div class="lab-hw-meta"><b>Мой ответ был:</b> '+escapeHTML(it.student_answer)+'</div>');
      }
      return '<div class="lab-hw-item" data-i="'+i+'">'+
        '<button type="button" class="lab-hw-rm" title="Убрать">×</button>'+
        '<span class="lab-hw-kind">'+escapeHTML(kindLabel(it.kind))+'</span>'+
        '<div class="lab-hw-q">'+escapeHTML(qText)+'</div>'+
        lines.join('')+
      '</div>';
    }).join('');
    list.querySelectorAll('.lab-hw-rm').forEach(function(b){
      b.addEventListener('click', function(){
        var idx = +b.closest('.lab-hw-item').dataset.i;
        var a = loadHw(); a.splice(idx, 1); saveHw(a);
        refreshFabCount(); renderList();
      });
    });
  }

  function escapeHTML(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function buildOverlay(){
    overlayEl = document.createElement('div');
    overlayEl.className = 'lab-hw-overlay';
    overlayEl.innerHTML =
      '<div class="lab-hw-modal">'+
        '<div class="lab-hw-modal-h">'+
          '<div>'+
            '<h3>📚 Моя домашка</h3>'+
            '<div class="sub">Задания которые я положил/а сюда. Учитель увидит этот список.</div>'+
          '</div>'+
          '<button type="button" class="lab-hw-close" aria-label="Закрыть">×</button>'+
        '</div>'+
        '<div class="lab-hw-list"></div>'+
        '<div class="lab-hw-modal-f">'+
          '<button type="button" class="lab-hw-clear">🗑 Очистить</button>'+
          '<button type="button" class="lab-hw-send">📤 Отправить учителю</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('click', function(e){ if (e.target === overlayEl) closeOverlay(); });
    overlayEl.querySelector('.lab-hw-close').addEventListener('click', closeOverlay);
    overlayEl.querySelector('.lab-hw-clear').addEventListener('click', function(){
      if (!confirm('Удалить все задания из домашки?')) return;
      saveHw([]); refreshFabCount(); renderList();
    });
    overlayEl.querySelector('.lab-hw-send').addEventListener('click', sendHomework);
  }

  function openOverlay(){
    if (!overlayEl) buildOverlay();
    renderList();
    overlayEl.classList.add('show');
  }
  function closeOverlay(){
    if (overlayEl) overlayEl.classList.remove('show');
  }

  async function ensureName(){
    var n = getName();
    if (n) return n;
    // Если ученик ещё не вводил имя — спросим коротко прямо здесь
    return new Promise(function(resolve){
      var name = window.prompt('Как тебя зовут? (учитель увидит это имя в уведомлении)') || '';
      name = name.trim();
      if (name) setName(name);
      resolve(name);
    });
  }

  async function sendHomework(){
    if (observerView) { toast('👁 Observer · просто смотрю как ученик отправит'); return; }
    var arr = loadHw();
    if (!arr.length) return;
    var sendBtn = overlayEl.querySelector('.lab-hw-send');
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Отправляю…';
    var name = await ensureName();
    var room = roomFor(name);

    // Lazy SDK
    var ok = false, err = '';
    var title = (document.querySelector('.lab-hero h1, .hero h1, h1')?.textContent || document.title || '').trim();

    // PRIMARY: D1 через /api/homework/submit (без иностранщины, тот же домен)
    try {
      var misses = arr.map(function(it, i){
        var n = (i+1) + '.';
        var q = short(it.question || '(без вопроса)', 90);
        var extras = [];
        if (it.correct) extras.push('✓ ' + short(it.correct, 60));
        if (it.student_answer) extras.push('✗ ' + short(it.student_answer, 60));
        return n + ' ' + q + (extras.length ? ' (' + extras.join(' · ') + ')' : '');
      });
      var d1resp = await fetch('/api/homework/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: name || 'аноним',
          student_id: room,
          lesson_path: location.pathname,
          lesson_title: short(title, 100),
          section_id: 'homework-batch',
          items: arr,
          score: 0,
          total: arr.length,
          // pct — generated column, не отправляем
          misses: misses
        })
      });
      var d1json = await d1resp.json().catch(function(){return {}});
      if (d1resp.ok && d1json.ok) { ok = true; }
      else { err = d1json.error || ('D1 HTTP ' + d1resp.status); }
    } catch (e) { err = 'D1 fetch failed: ' + (e.message || e); }

    // FALLBACK на Supabase (если D1 endpoint ещё не задеплоен или упал)
    if (!ok) try {
      if (!window.supabase) {
        await new Promise(function(res, rej){
          var sc = document.createElement('script');
          sc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
          sc.onload = res; sc.onerror = rej;
          document.head.appendChild(sc);
        }).catch(function(){});
      }
      var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      var resp = await client.from('lab_submissions').insert({
        room_id: room,
        lesson_path: location.pathname,
        section_id: 'homework-batch',
        section_title: '📚 Homework · ' + arr.length + ' item' + (arr.length>1?'s':'') + ' · ' + short(title, 60),
        student_role: name ? ('homework:' + name) : 'homework:anonymous',
        score: 0,
        total: arr.length,
        misses: arr
      });
      if (!resp.error) { ok = true; err = ''; }
    } catch (e) { /* fallback failed, ok остаётся false */ }

    // Broadcast в firehose (Supabase) — для teacher-live.html, если доступен
    if (window.supabase) try {
      var clientFh = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      var fh = clientFh.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
      fh.subscribe(function(s){
        if (s === 'SUBSCRIBED') {
          fh.send({ type:'broadcast', event:'homework-batch', payload: {
            room_id: room, name: name||'', lesson_path: location.pathname,
            lesson_title: short(title, 80), count: arr.length, ts: Date.now()
          }});
          setTimeout(function(){ fh.unsubscribe(); }, 800);
        }
      });
    } catch(e){}
    sendBtn.disabled = false;
    sendBtn.textContent = '📤 Отправить учителю';
    if (ok) {
      saveHw([]);
      refreshFabCount();
      renderList();
      toast('Домашка улетела учителю · ' + arr.length + ' заданий');
      setTimeout(closeOverlay, 1200);
    } else {
      toast('Не получилось отправить: ' + (err || 'попробуй ещё'));
    }
  }

  ready(function(){
    purgeStale(); // 48 ч TTL — чтобы старые карточки не висели в чужих скринах
    injectStyle();
    try {
      if (localStorage.getItem('lab-teacher-mode') === 'on') {
        document.body.classList.add('lab-teacher-on');
      }
    } catch(e){}
    buildFab();
    buildTopEntry();
    scanAndDecorate();
    refreshFabCount();
    window.addEventListener('storage', function(ev){
      if (!ev.key || ev.key === hwKey()) refreshFabCount();
    });
    // Listener — ученик принимает homework-section-push от учителя
    (function hookHwReceive(){
      if (!window.supabase) return setTimeout(hookHwReceive, 400);
      try {
        var c = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        var ch = c.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
        ch.on('broadcast', { event:'homework-section-push' }, function(p){
          var data = p.payload || {};
          if (data.lesson_path !== location.pathname) return;
          if (!Array.isArray(data.items) || !data.items.length) return;
          var arr = loadHw();
          var added = 0;
          data.items.forEach(function(it){
            var dup = arr.some(function(x){ return x.section_id===it.section_id && x.question===it.question && x.kind===it.kind; });
            if (!dup) { arr.push(it); added++; }
          });
          if (added) {
            saveHw(arr);
            refreshFabCount();
            toast('📚 Учитель закинул в домашку: ' + added + ' заданий');
          }
        });
        ch.subscribe();
      } catch(e){}
    })();
    // Если урок дорисовывается динамически — переоблететь
    var mo = new MutationObserver(function(){ scanAndDecorate(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
