/* lab-vocab-saver.js — universal "Add to my dictionary" button for any Lab lesson.
   Finds vocab elements on the page and turns them into add-to-dictionary triggers.
   Floating box bottom-right shows current count + Copy / Clear actions.
   Storage: localStorage keyed by location.pathname.
   Sources detected:
   - .tr[data-ru]            (hover-translation spans — switzerland canon)
   - .vocab-card[data-word]  (TOEFL/Tom Sawyer/Bella/etc canon flip-cards)
   - .vocab-card[data-back]  (Julia Bodrum/julia-vampire/inline canon)
   - .flip-card[data-word]   (Jerusalem canon)
   - .vw .w + .ru            (Settling-Toronto cheat-sheet canon — TTS phrase boxes)
   Drop-in: <script src="../../assets/lab-vocab-saver.js" defer></script>

   v2 2026-07-12 · UNIFIED HW STORE:
   Мария 12.07: одна корзина, одна кнопка. Раньше на карточке .vocab-card висели
   параллельно жёлтый + от lab-homework (в 'lab-hw:<path>') и зелёный + от нас
   (в 'lab-vocab:<path>'). Ученик добавлял «слово» — попадало в два разных
   store, дубликат. Теперь:
   1. Зелёный плюсик СКРЫТ CSS-ом на всех .vocab-card и .vw box (legacy .tr
      подчёркивания оставляем — они не карточки, конфликта с homework нет).
   2. Case-insensitive dedupe в uniqAdd (было case-sensitive — «Environment» ≠
      «environment»).
   3. Bottom-right «📒 My Vocabulary» pill остаётся ЖИВЫМ — читает старый
      lab-vocab: store для совместимости. Скоро мигрируем в lab-hw:.
*/
(function () {
  'use strict';

  var KEY = 'lab-vocab:' + location.pathname;
  var list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}

  function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }

  function uniqAdd(word, meaning) {
    word = (word || '').trim();
    meaning = (meaning || '').trim();
    if (!word) return false;
    // v2: case-insensitive dedupe (было case-sensitive — «Environment»/«environment»
    // считались разными словами и добавлялись дважды)
    var lc = word.toLowerCase();
    if (list.some(function (v) { return (v.word || '').toLowerCase() === lc; })) return false;
    list.push({ word: word, ru: meaning });
    save();
    return true;
  }

  function injectStyle() {
    if (document.getElementById('lab-vocab-style')) return;
    var css = ''
      + '#labVocabBox{position:fixed;bottom:64px;right:16px;z-index:9998;background:#fff;color:#1a1a1a;'
      + 'border:1.5px solid #2BB673;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.18);'
      + 'font-family:system-ui,-apple-system,sans-serif;font-size:.86rem;padding:8px 14px;cursor:pointer;font-weight:700;'
      + 'transition:.18s;max-width:340px}'
      + '#labVocabBox:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.24)}'
      + '#labVocabBox.expanded{padding:14px 16px;cursor:default;background:#fffaef}'
      + '#labVocabBox .lv-title{display:flex;align-items:center;gap:8px;margin-bottom:8px}'
      + '#labVocabBox .lv-title span{color:#2BB673;font-weight:800}'
      + '#labVocabBox .lv-list{max-height:280px;overflow-y:auto;margin:8px 0;border-top:1px solid #eee;padding-top:8px}'
      + '#labVocabBox .lv-item{display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-weight:500;font-size:.82rem;border-bottom:1px dashed #eee}'
      + '#labVocabBox .lv-item:last-child{border-bottom:none}'
      + '#labVocabBox .lv-item .w{color:#0a3d62;font-weight:700}'
      + '#labVocabBox .lv-item .r{color:#666;text-align:right;font-style:italic}'
      + '#labVocabBox .lv-empty{color:#999;font-style:italic;font-weight:400;font-size:.82rem;padding:8px 0;text-align:center}'
      + '#labVocabBox .lv-actions{display:flex;gap:6px;margin-top:8px}'
      + '#labVocabBox .lv-actions button{flex:1;font:700 11px/1 system-ui;background:#0a3d62;color:#fff;border:none;border-radius:6px;padding:8px;cursor:pointer;letter-spacing:.04em;text-transform:uppercase}'
      + '#labVocabBox .lv-actions button.danger{background:#c0392b}'
      + '#labVocabBox .lv-close{position:absolute;top:8px;right:10px;font-size:1rem;color:#999;cursor:pointer;font-weight:700;background:none;border:none;padding:0;line-height:1}'
      + '/* Plus-button on vocab cards */'
      + '.lv-add-btn{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(43,182,115,.85);color:#fff;'
      + 'border:none;font-weight:900;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,.2);transition:.18s;z-index:5}'
      + '.lv-add-btn:hover{background:rgba(43,182,115,1);transform:scale(1.1)}'
      + '.lv-add-btn.added{background:#0a3d62;cursor:default}'
      + '.lv-add-btn.added::after{content:""}'
      + '.lv-host{position:relative}'
      + '.tr.lv-added{background:rgba(43,182,115,.18);border-radius:3px;padding:0 3px}'
      /* v2 2026-07-12: скрываем зелёный + на .vocab-card / .flip-card / .vw —
         эти карточки теперь идут в единый lab-hw store через lab-homework.js
         (жёлтый + от .lab-hw-add). Легаси-подчёркивания .tr[data-ru] в тексте
         НЕ трогаем — там нет конфликта, и это часто единственный способ
         вытащить слово из inline-текста урока. */
      + '.vocab-card .lv-add-btn,.flip-card .lv-add-btn,.vw .lv-add-btn{display:none!important}';
    var style = document.createElement('style');
    style.id = 'lab-vocab-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderBox() {
    var box = document.getElementById('labVocabBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'labVocabBox';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        box.classList.toggle('expanded');
        renderBox();
      });
    }
    if (box.classList.contains('expanded')) {
      var items = list.length
        ? list.map(function (v) {
            return '<div class="lv-item"><span class="w">' + escapeHtml(v.word) + '</span><span class="r">' + escapeHtml(v.ru) + '</span></div>';
          }).join('')
        : '<div class="lv-empty">Tap «+» on any card or underlined word in the text — it lands here</div>';
      box.innerHTML = ''
        + '<button class="lv-close" title="collapse">×</button>'
        + '<div class="lv-title">📒 My Vocabulary · <span>' + list.length + '</span></div>'
        + '<div class="lv-list">' + items + '</div>'
        + '<div class="lv-actions"><button id="lvCopy">📋 Copy</button><button id="lvClear" class="danger">🗑 Clear</button></div>';
      box.querySelector('.lv-close').addEventListener('click', function (e) { e.stopPropagation(); box.classList.remove('expanded'); renderBox(); });
      box.querySelector('#lvCopy').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!list.length) return;
        var text = list.map(function (v) { return v.word + ' — ' + v.ru; }).join('\n');
        navigator.clipboard.writeText(text).then(function () {
          var btn = box.querySelector('#lvCopy');
          var old = btn.textContent;
          btn.textContent = '✓ Copied';
          setTimeout(function () { btn.textContent = old; }, 1400);
        });
      });
      box.querySelector('#lvClear').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!list.length) return;
        if (!confirm('Clear vocabulary? (' + list.length + ' words)')) return;
        list = [];
        save();
        document.querySelectorAll('.lv-added, .lv-add-btn.added').forEach(function (el) {
          el.classList.remove('lv-added', 'added');
          if (el.classList.contains('lv-add-btn')) el.textContent = '+';
        });
        renderBox();
      });
    } else {
      box.innerHTML = '📒 Vocabulary · <span style="color:#2BB673">' + list.length + '</span>';
    }
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function wireSources() {
    // 1. Hover-translation spans (.tr[data-ru])
    document.querySelectorAll('.tr[data-ru]').forEach(function (el) {
      var word = (el.textContent || '').trim();
      var ru = el.getAttribute('data-ru') || '';
      if (!word || !ru) return;
      if (list.some(function (v) { return v.word === word; })) el.classList.add('lv-added');
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (uniqAdd(word, ru)) { el.classList.add('lv-added'); renderBox(); }
      });
    });

    // 2. .vocab-card with data-word + nested meaning
    document.querySelectorAll('.vocab-card[data-word], .flip-card[data-word]').forEach(function (card) {
      if (card.querySelector('.lv-add-btn')) return;
      var word = card.getAttribute('data-word') || (card.querySelector('.word, .vocab-front .word, strong') || {}).textContent || '';
      var back = card.getAttribute('data-back') || '';
      if (!back) {
        var b = card.querySelector('.vocab-back, .flip-back');
        if (b) back = b.textContent.replace(/\s+/g, ' ').trim();
      }
      word = word.trim();
      back = back.trim();
      if (!word) return;

      card.classList.add('lv-host');
      var btn = document.createElement('button');
      btn.className = 'lv-add-btn';
      btn.type = 'button';
      btn.title = 'Add to vocabulary';
      btn.textContent = '+';
      if (list.some(function (v) { return v.word === word; })) { btn.classList.add('added'); btn.textContent = '✓'; }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (uniqAdd(word, back)) { btn.classList.add('added'); btn.textContent = '✓'; renderBox(); }
      });
      card.appendChild(btn);
    });

    // 3. .vw boxes — phrase + RU meaning (settling-in-toronto cheat-sheet canon)
    document.querySelectorAll('.vw').forEach(function (box) {
      if (box.querySelector('.lv-add-btn')) return;
      var wEl = box.querySelector('.w');
      var rEl = box.querySelector('.ru');
      if (!wEl || !rEl) return;
      var word = (wEl.textContent || '').trim();
      var ru = (rEl.textContent || '').trim();
      if (!word) return;

      box.classList.add('lv-host');
      var btn = document.createElement('button');
      btn.className = 'lv-add-btn';
      btn.type = 'button';
      btn.title = 'Add to vocabulary';
      btn.textContent = '+';
      if (list.some(function (v) { return v.word === word; })) { btn.classList.add('added'); btn.textContent = '✓'; }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (uniqAdd(word, ru)) { btn.classList.add('added'); btn.textContent = '✓'; renderBox(); }
      });
      box.appendChild(btn);
    });
  }

  function onReady() {
    setTimeout(function () {
      injectStyle();
      renderBox();
      wireSources();
    }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
