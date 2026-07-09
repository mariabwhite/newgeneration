/* lab-lexicon.js v1 · 2026-07-09
   Universal Today's Lexicon — floating vocab collector, тот же UX что
   у Voyager L1-L4 (`.vocab-box`), но подцепляется к любому уроку.

   Что делает:
   1. Инжектит floating `.lab-lex-box` bottom-right (или встраивает если
      на странице уже есть `#vocabBox` — тогда не дублирует).
   2. Ловит клики на:
      - `.vocab-card[data-word]`, `.flip-card[data-en]` — берёт data-en/word + data-ru
      - `.vocab-word` внутри `.vocab-card` — тоже
      - `<span class="tr" data-ru="...">` — highlighted inline words
   3. Отдаёт `window.__addVocab(en, ru)` наружу — для интеграции.
   4. Персистит собранное в localStorage `lab-lex:<pathname>` (7 дней TTL).
   5. Автоматически восстанавливает после перезагрузки.

   НЕ делает:
   - Не дублирует существующий `#vocabBox` (Voyager серия — не трогаем).
   - Не работает в observer/teacher-mode: там свой поток.
*/
(function(){
  if (window.__labLexiconLoaded) return;
  window.__labLexiconLoaded = true;

  // Не запускаться в observer-mode (учитель watching)
  if (/[?&](observe|role=teacher)/.test(location.search)) return;

  // Если у урока свой vocab-box (Voyager L1-L4) — не мешаем
  if (document.getElementById('vocabBox')) return;

  var LS_KEY = 'lab-lex:' + location.pathname;
  var TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function load(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { items: [], ts: Date.now() };
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.items)) return { items: [], ts: Date.now() };
      if (Date.now() - (d.ts || 0) > TTL_MS) return { items: [], ts: Date.now() };
      return d;
    } catch(e){ return { items: [], ts: Date.now() }; }
  }
  function save(d){
    try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch(e){}
  }

  function injectStyle(){
    if (document.getElementById('lab-lex-style')) return;
    var s = document.createElement('style');
    s.id = 'lab-lex-style';
    s.textContent =
      '.lab-lex-box{position:fixed;bottom:20px;right:20px;'+
        'background:linear-gradient(135deg,var(--brand,#7c3aed),var(--accent,#f59e0b));'+
        'color:#fff;border-radius:50px;padding:12px 20px;'+
        'font:800 13px/1 "JetBrains Mono","Manrope",monospace;letter-spacing:.06em;'+
        'box-shadow:0 12px 40px rgba(0,0,0,.28);cursor:pointer;z-index:997;'+
        'display:flex;align-items:center;gap:10px;max-width:calc(100% - 40px);'+
        'transition:all .2s ease-out}'+
      '.lab-lex-box:hover{transform:translateY(-2px);box-shadow:0 18px 50px rgba(0,0,0,.34)}'+
      '.lab-lex-box.expanded{max-width:420px;width:calc(100% - 40px);border-radius:18px;'+
        'flex-direction:column;align-items:stretch;padding:18px 20px;cursor:default}'+
      '.lab-lex-title{cursor:pointer;display:flex;align-items:center;gap:10px;justify-content:space-between}'+
      '.lab-lex-title .h{display:inline-flex;align-items:center;gap:8px}'+
      '.lab-lex-title .n{background:rgba(255,255,255,.24);padding:3px 10px;border-radius:999px;font-weight:900}'+
      '.lab-lex-hint{font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:.14em;font-weight:700}'+
      '.lab-lex-list{display:none;flex-direction:column;gap:6px;max-height:50vh;overflow-y:auto;'+
        'margin-top:14px;padding-right:4px}'+
      '.lab-lex-box.expanded .lab-lex-list{display:flex}'+
      '.lab-lex-item{background:rgba(255,255,255,.14);border-radius:8px;padding:8px 12px;'+
        'display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;'+
        'font-family:"Manrope",sans-serif;font-weight:600}'+
      '.lab-lex-item .word{font-weight:800}'+
      '.lab-lex-item .ru{opacity:.85;font-weight:500;font-style:italic;text-align:right}'+
      '.lab-lex-item.empty{background:transparent;justify-content:center;font-style:italic;opacity:.7;font-weight:500}'+
      '.lab-lex-clear{background:transparent;border:1px solid rgba(255,255,255,.36);color:#fff;'+
        'padding:6px 10px;border-radius:50px;font:800 10px/1 "JetBrains Mono",monospace;'+
        'letter-spacing:.14em;cursor:pointer;text-transform:uppercase;margin-top:10px;align-self:flex-end;'+
        'transition:.15s}'+
      '.lab-lex-clear:hover{background:rgba(255,255,255,.16)}'+
      '@media(max-width:640px){.lab-lex-box{bottom:14px;right:14px;left:14px;justify-content:center;max-width:none}'+
        '.lab-lex-box.expanded{right:14px;left:14px}}';
    document.head.appendChild(s);
  }

  var box, list, ctr, hint;
  var state = load();
  var added = {};
  state.items.forEach(function(it){ added[(it.en || '').toLowerCase()] = it.ru || ''; });

  function buildBox(){
    box = document.createElement('div');
    box.className = 'lab-lex-box';
    box.innerHTML =
      '<div class="lab-lex-title">'+
        '<span class="h">📒 <span>Today\'s lexicon</span> · <span class="n" id="lab-lex-count">0</span></span>'+
        '<span class="lab-lex-hint" id="lab-lex-hint">tap to open</span>'+
      '</div>'+
      '<div class="lab-lex-list" id="lab-lex-list">'+
        '<div class="lab-lex-item empty">Click any word card / flip-card / highlighted word — it lands here.</div>'+
      '</div>'+
      '<button class="lab-lex-clear" id="lab-lex-clear">🗑 clear</button>';
    document.body.appendChild(box);
    list = box.querySelector('#lab-lex-list');
    ctr = box.querySelector('#lab-lex-count');
    hint = box.querySelector('#lab-lex-hint');

    box.querySelector('.lab-lex-title').addEventListener('click', function(){
      box.classList.toggle('expanded');
      hint.textContent = box.classList.contains('expanded') ? 'tap title to close' : 'tap to open';
    });
    box.querySelector('#lab-lex-clear').addEventListener('click', function(){
      state.items = [];
      added = {};
      save(state);
      renderAll();
    });
  }

  function renderAll(){
    if (!list) return;
    list.innerHTML = '';
    if (!state.items.length) {
      var empty = document.createElement('div');
      empty.className = 'lab-lex-item empty';
      empty.textContent = 'Click any word card / flip-card / highlighted word — it lands here.';
      list.appendChild(empty);
    } else {
      state.items.forEach(function(it){
        var el = document.createElement('div');
        el.className = 'lab-lex-item';
        el.innerHTML = '<span class="word">' + escapeHTML(it.en) + '</span>' +
                       '<span class="ru">' + escapeHTML(it.ru || '') + '</span>';
        list.appendChild(el);
      });
    }
    ctr.textContent = state.items.length;
  }

  function add(en, ru){
    en = String(en || '').trim();
    ru = String(ru || '').trim();
    if (!en) return;
    var key = en.toLowerCase();
    if (added[key] !== undefined) return;
    added[key] = ru;
    state.items.push({ en: en, ru: ru });
    state.ts = Date.now();
    save(state);
    renderAll();
    // Мигаем boxом чтобы заметно
    if (box) {
      box.style.transform = 'translateY(-6px) scale(1.05)';
      setTimeout(function(){ box.style.transform = ''; }, 200);
    }
  }
  window.__addVocab = add;

  function escapeHTML(s){
    return String(s || '').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function bindTargets(){
    // 1. .vocab-card — data-word / vocab-word + data-ru / vocab-ru
    document.querySelectorAll('.vocab-card, .word-card, .vocabulary-item').forEach(function(card){
      if (card.__lexBound) return;
      card.__lexBound = true;
      card.addEventListener('click', function(e){
        // Не мешаем встроенным flip / listen кнопкам
        if (e.target.closest('button, .icon-btn, .speak-btn, [data-say]')) return;
        var en = card.dataset.word ||
                 (card.querySelector('.vocab-word, .word, .term, .front .word')?.textContent || '').trim();
        var ru = card.dataset.ru ||
                 (card.querySelector('.vocab-ru, .ru, .meaning')?.textContent || '').trim();
        if (en) add(en, ru);
      });
    });
    // 2. .flip-card — data-en / data-ru
    document.querySelectorAll('.flip-card[data-en]').forEach(function(card){
      if (card.__lexBound) return;
      card.__lexBound = true;
      card.addEventListener('click', function(e){
        if (e.target.closest('button, .icon-btn')) return;
        var en = card.dataset.en || '';
        var ru = card.dataset.ru || '';
        if (en) add(en, ru);
      });
    });
    // 3. .tr[data-ru] highlighted inline
    document.querySelectorAll('.tr[data-ru], .lex-hi[data-ru]').forEach(function(el){
      if (el.__lexBound) return;
      el.__lexBound = true;
      el.style.cursor = 'pointer';
      el.addEventListener('click', function(){
        var en = (el.textContent || '').trim();
        add(en, el.dataset.ru);
        el.classList.add('added');
      });
    });
  }

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function(){
    injectStyle();
    buildBox();
    renderAll();
    bindTargets();
    // Ре-бинд после динамических правок (lab-vocab-builder добавляет карточки)
    var mo = new MutationObserver(function(){ bindTargets(); });
    mo.observe(document.body, { childList:true, subtree:true });
  });
})();
