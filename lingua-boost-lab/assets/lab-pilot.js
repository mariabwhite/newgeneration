/* lab-pilot.js — Lift TOC + per-section Submit + Lesson Summary.
   Sweeps existing state-classes (.right/.wrong/.filled/.correct/.matched)
   that lab handlers already apply, so no per-exercise wiring needed.
   Optional theme: set <body data-lab-theme="dark"> on dark-themed lessons. */
(function(){
  if (window.__labPilotLoaded) return;
  window.__labPilotLoaded = true;

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function(){
    // v4 · 2026-07-09 · расширен селектор до section.block, section.lab-section,
    // section.canon-l-section — раньше находил только section.section, из-за чего
    // на A1-01…A1-08 и других уроках с section.block (архетипа Present Simple)
    // ЛИФТ вообще не активировался: не было TOC, «📋 Сдать раздел», «📊 Итог урока».
    const sections = [...document.querySelectorAll('section.section, section.block, section.lab-section, section.canon-l-section, section.lesson-section')];
    if (sections.length < 2) return;

    const theme = (document.body.dataset.labTheme === 'dark') ? 'dark' : 'light';
    const themeAttr = theme === 'dark' ? ' data-theme="dark"' : '';
    const submitDark = theme === 'dark' ? ' dark' : '';
    const fabDark = theme === 'dark' ? ' dark' : '';

    // ===== Sticky TOC =====
    const toc = document.createElement('div');
    toc.className = 'lp-toc';
    if (theme === 'dark') toc.dataset.theme = 'dark';
    sections.forEach((s, i) => {
      const num = String(i+1).padStart(2,'0');
      const title = (s.querySelector('h2')?.textContent || ('Section '+num)).trim();
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lp-toc-btn';
      b.textContent = num;
      b.title = title;
      b.addEventListener('click', () => s.scrollIntoView({behavior:'smooth', block:'start'}));
      toc.appendChild(b);
      if (!s.id) s.id = 'lp-section-' + i;
    });
    document.body.appendChild(toc);

    // Active highlight on scroll
    try {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = sections.indexOf(e.target);
            [...toc.children].forEach((b, i) => b.classList.toggle('active', i === idx));
          }
        });
      }, { rootMargin: '-30% 0px -55% 0px' });
      sections.forEach(s => obs.observe(s));
    } catch(e){}

    // ===== Submit button + Report under each section =====
    sections.forEach((section) => {
      const card = section.querySelector('.card') || section;
      const actions = document.createElement('div');
      actions.className = 'lp-actions';
      actions.innerHTML = '<button type="button" class="lp-submit'+submitDark+'">📋 Сдать раздел</button>';
      const report = document.createElement('div');
      report.className = 'lp-report';
      if (theme === 'dark') report.dataset.theme = 'dark';
      card.appendChild(actions);
      card.appendChild(report);
      actions.querySelector('button').addEventListener('click', () => renderReport(section, report));
    });

    // ===== Lesson summary FAB =====
    const fab = document.createElement('div');
    fab.className = 'lp-fab';
    fab.innerHTML = '<button type="button" class="lp-fab-btn'+fabDark+'">📊 Итог урока</button>';
    document.body.appendChild(fab);

    const overlay = document.createElement('div');
    overlay.className = 'lp-overlay';
    overlay.innerHTML = '<div class="lp-modal"'+themeAttr+'>' +
      '<button type="button" class="lp-close" aria-label="Close">×</button>' +
      '<h2>📊 Итог урока</h2>' +
      '<div class="lp-sub">Сводка по всем разделам, что ты прошёл.</div>' +
      '<div class="lp-body"></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.lp-close').addEventListener('click', () => overlay.classList.remove('show'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });

    fab.querySelector('button').addEventListener('click', () => renderSummary(overlay));

    // ===== Core collector =====
    function txt(el){ return el ? (el.textContent || '').trim() : ''; }
    function shortQ(s, n){ s = s||''; return s.length > n ? s.slice(0, n-1) + '…' : s; }

    function collect(section){
      let total = 0, correct = 0;
      const misses = [];

      // T/F/NS-style rows
      section.querySelectorAll('.tfns-row').forEach((row, i) => {
        total++;
        const right = row.querySelector('button.right');
        const wrong = row.querySelector('button.wrong');
        const q = shortQ(txt(row.querySelector('.stmt')) || ('Q'+(i+1)), 110);
        if (right && !wrong) correct++;
        else if (wrong) misses.push({ q, yours: txt(wrong), correct: right ? txt(right) : '—' });
        else misses.push({ q, skip: true });
      });

      // MCQ rows
      section.querySelectorAll('.mcq-row').forEach((row, i) => {
        total++;
        const right = row.querySelector('.mcq-opts button.correct, .mc-opts button.correct');
        const wrong = row.querySelector('.mcq-opts button.wrong, .mc-opts button.wrong');
        const q = shortQ(txt(row.querySelector('.mcq-q, .mc-q')) || ('Q'+(i+1)), 110);
        if (right && !wrong) correct++;
        else if (wrong) misses.push({ q, yours: txt(wrong), correct: right ? txt(right) : '—' });
        else misses.push({ q, skip: true });
      });

      // .mc-item (legacy MCQ)
      section.querySelectorAll('.mc-item').forEach((row, i) => {
        if (row.querySelector('.mcq-q, .mc-q') && row.querySelector('.mcq-opts, .mc-opts')) return; // covered above
        total++;
        const right = row.querySelector('button.correct, button.right');
        const wrong = row.querySelector('button.wrong');
        const q = shortQ(txt(row.querySelector('.mc-q, .stmt, .ctx')) || ('Q'+(i+1)), 110);
        if (right && !wrong) correct++;
        else if (wrong) misses.push({ q, yours: txt(wrong), correct: right ? txt(right) : '—' });
        else misses.push({ q, skip: true });
      });

      // Match items
      const matchAll = section.querySelectorAll('.match-item, .match-card, .match-row');
      if (matchAll.length) {
        // each pair (one matched + one matched) — count matched count divided by 2 if dual-column, else as-is
        const matched = section.querySelectorAll('.match-item.matched, .match-card.matched').length;
        if (matched) {
          // assume pairs of two — divide by 2
          const pairs = Math.floor(matched / 2) || matched;
          total += pairs;
          correct += pairs;
        }
        // select-based match
        section.querySelectorAll('.match-row select').forEach((sel, i) => {
          total++;
          if (sel.classList.contains('right')) correct++;
          else if (sel.classList.contains('wrong')) {
            const q = shortQ(txt(sel.closest('.match-row')?.querySelector('.stmt')) || ('Match '+(i+1)), 110);
            misses.push({ q, yours: sel.value, correct: sel.dataset.answer || '—' });
          } else if (!sel.value) {
            const q = shortQ(txt(sel.closest('.match-row')?.querySelector('.stmt')) || ('Match '+(i+1)), 110);
            misses.push({ q, skip: true, correct: sel.dataset.answer || '—' });
          } else { total--; }
        });
      }

      // Gap-fill (.gap)
      section.querySelectorAll('.gap').forEach((g, i) => {
        total++;
        if (g.classList.contains('filled')) correct++;
        else misses.push({ q: 'Gap '+(i+1), skip: true, correct: g.dataset.answer || '—' });
      });

      // Word-formation (.wf-row)
      section.querySelectorAll('.wf-row').forEach((row, i) => {
        total++;
        const inp = row.querySelector('input');
        const ctx = shortQ(txt(row.querySelector('.ctx')) || ('Item '+(i+1)), 110);
        if (inp?.classList.contains('right')) correct++;
        else if (inp?.classList.contains('wrong')) misses.push({ q: ctx, yours: inp.value, correct: inp.dataset.answer || row.querySelector('.hint')?.textContent || '—' });
        else misses.push({ q: ctx, skip: true, correct: inp?.dataset.answer || '—' });
      });

      // Gapfill text inputs (.gapfill input)
      section.querySelectorAll('.gapfill input').forEach((inp, i) => {
        total++;
        if (inp.classList.contains('correct') || inp.classList.contains('right')) correct++;
        else if (inp.classList.contains('wrong')) misses.push({ q: 'Gap '+(i+1), yours: inp.value, correct: inp.dataset.answer || '—' });
        else misses.push({ q: 'Gap '+(i+1), skip: true, correct: inp.dataset.answer || '—' });
      });

      // -ing classify bins (.classify-item / .placed)
      section.querySelectorAll('.classify-item, .ord-pill').forEach(() => {});

      // Mic rows (with WPM)
      section.querySelectorAll('.mic-row').forEach((row, i) => {
        if (!row.dataset.attempted) return; // skip not-attempted mic rows from count
        total++;
        const score = parseFloat(row.dataset.score || '0');
        const wpm = parseInt(row.dataset.wpm || '0', 10);
        const q = shortQ(txt(row.querySelector('.mic-text')) || ('Speaking '+(i+1)), 110);
        if (score >= 0.85) correct++;
        else misses.push({ q, yours: (Math.round(score*100))+'% match' + (wpm ? ' · '+wpm+' WPM' : ''), correct: row.dataset.target || '—' });
      });

      // Vocab flip cards — informational, not scored
      // Sentence builder (.builder)
      section.querySelectorAll('.builder').forEach((b, i) => {
        const status = b.querySelector('.builder-status, .check-result');
        if (!status) return;
        total++;
        if (status.classList.contains('right') || status.classList.contains('ok') || /✓|correct|right/i.test(status.textContent||'')) correct++;
        else if (status.classList.contains('wrong') || /✗|wrong|miss/i.test(status.textContent||'')) misses.push({ q: shortQ(txt(b.querySelector('.target-line, .prompt')) || ('Builder '+(i+1)), 110), yours: txt(status), correct: b.dataset.answer || '—' });
      });

      return { total, correct, misses };
    }

    function reportHTML(r){
      let html = '<h4>📋 Результат раздела</h4>';
      const pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
      html += '<div class="lp-stats">Score: <strong>'+r.correct+' / '+r.total+'</strong> · '+pct+'%</div>';
      if (!r.misses.length) {
        html += '<div class="lp-good">✅ Всё верно — отлично!</div>';
      } else {
        html += '<ul class="lp-list">';
        r.misses.forEach(m => {
          if (m.skip) {
            html += '<li class="lp-item skip"><div class="q">'+escapeHTML(m.q)+'</div><div class="skip-note">пропущено · правильно: <span class="correct">'+escapeHTML(m.correct||'?')+'</span></div></li>';
          } else {
            html += '<li class="lp-item"><div class="q">'+escapeHTML(m.q)+'</div><div>твой: <span class="yours">'+escapeHTML(m.yours||'—')+'</span> → правильно: <span class="correct">'+escapeHTML(m.correct||'—')+'</span></div></li>';
          }
        });
        html += '</ul>';
      }
      return html;
    }

    // Перед сбором отчёта — авто-прокликать «Проверить» и проставить классы
    // на text inputs которые ученик заполнил, но не нажал Check.
    // Поддержанные варианты текстов кнопок (всё, что встречается в библиотеке):
    //   Проверить / Проверь / Сдать / Сверить / Ответить / Готово / Готова /
    //   Check / Check Now / Check answers / Check sentence / Check vocabulary / …
    //   Done / Submit
    // Маркеры результата: right / correct / ok = верно; wrong / miss / fail = неверно.
    const VERB_HEAD_RE = /^(проверить|проверь|сдать|сверить|ответить|готов[оа]?|check|verify|done|submit)\b/i;
    function isCheckBtn(btn){
      if (btn.disabled) return false;
      // Чёрный список — кнопки, которые не должны быть «авто-проверкой»
      if (btn.classList.contains('lp-submit') || btn.classList.contains('play-line') ||
          btn.classList.contains('lab-hw-add') || btn.classList.contains('lab-hw-rm') ||
          btn.classList.contains('lp-fab-btn') || btn.classList.contains('lp-close') ||
          btn.classList.contains('reset') || btn.classList.contains('btn-reset') ||
          btn.classList.contains('hint') || btn.classList.contains('reveal') ||
          btn.classList.contains('show-answer')) return false;
      // Белый список классов — сразу true
      if (btn.classList.contains('check-btn') || btn.classList.contains('btn-check')) return true;
      const t = (btn.textContent || '').replace(/\s+/g,' ').trim();
      if (!t) return false;
      if (t.length > 40) return false;          // длинные = не кнопка, а текст
      if (/[.!?]$/.test(t)) return false;        // предложения с точкой = не кнопка
      return VERB_HEAD_RE.test(t);
    }
    function hasStatus(el){
      return el.classList.contains('right') || el.classList.contains('correct') ||
             el.classList.contains('ok')    || el.classList.contains('wrong')   ||
             el.classList.contains('miss')  || el.classList.contains('fail');
    }
    function normaliseStatusClasses(section){
      // collect ниже ловит right/wrong/correct/filled — добавим псевдонимы
      section.querySelectorAll('.ok').forEach(el => el.classList.add('right'));
      section.querySelectorAll('.miss, .fail').forEach(el => el.classList.add('wrong'));
    }
    function autoCheckSection(section){
      // 1) Все кнопки «Проверить / Check ...» — клик
      section.querySelectorAll('button').forEach(btn => {
        if (isCheckBtn(btn)) { try { btn.click(); } catch(e){} }
      });
      // 2) Text inputs (gapfill / wf-row / любые input[type=text]) —
      //    если есть value и data-answer, проставить класс
      const norm = s => s.toLowerCase().replace(/[.,!?;:]+$/, '').replace(/\s+/g,' ').trim();
      section.querySelectorAll('input[type="text"], .gapfill input, .wf-row input').forEach(inp => {
        if (hasStatus(inp)) return;
        const ans = (inp.dataset.answer || inp.dataset.ans || '').trim();
        const user = (inp.value || '').trim();
        if (!ans || !user) return;
        // допускаем несколько правильных вариантов: «a/b» или «a|b»
        const variants = ans.split(/[\/|]/).map(norm).filter(Boolean);
        const userN = norm(user);
        inp.classList.add(variants.indexOf(userN) >= 0 ? 'right' : 'wrong');
      });
      // 3) Select-based match — если есть value, но нет статуса, проверить через data-answer
      section.querySelectorAll('select').forEach(sel => {
        if (hasStatus(sel)) return;
        const ans = (sel.dataset.answer || sel.dataset.ans || '').trim();
        const user = (sel.value || '').trim();
        if (!ans || !user) return;
        sel.classList.add(ans === user ? 'right' : 'wrong');
      });
    }

    function renderReport(section, container){
      autoCheckSection(section);
      normaliseStatusClasses(section);
      const r = collect(section);
      if (!r.total) {
        container.innerHTML = '<div class="lp-good">ℹ В этом разделе нет автоматически оцениваемых заданий — пройди вручную и обсуди с учителем.</div>';
        container.classList.add('show');
        container.scrollIntoView({behavior:'smooth', block:'nearest'});
        return;
      }
      container.innerHTML = reportHTML(r);
      container.classList.add('show');
      container.scrollIntoView({behavior:'smooth', block:'nearest'});
      saveResult(section.id, r);
    }

    function renderSummary(overlay){
      const body = overlay.querySelector('.lp-body');
      let totT = 0, totC = 0, totM = 0;
      let html = '';
      sections.forEach((s, i) => {
        autoCheckSection(s);
        normaliseStatusClasses(s);
        const r = collect(s);
        if (!r.total) return;
        totT += r.total; totC += r.correct;
        const realMisses = r.misses;
        totM += realMisses.length;
        const title = (s.querySelector('h2')?.textContent || ('Section '+(i+1))).trim();
        html += '<div class="lp-sec-title">'+String(i+1).padStart(2,'0')+' · '+escapeHTML(title)+' — '+r.correct+'/'+r.total+'</div>';
        if (!realMisses.length) {
          html += '<div class="lp-good">✅ всё верно</div>';
        } else {
          html += '<ul class="lp-list">';
          realMisses.slice(0,6).forEach(m => {
            if (m.skip) html += '<li class="lp-item skip"><div class="q">'+escapeHTML(m.q)+'</div><div class="skip-note">пропущено · правильно: <span class="correct">'+escapeHTML(m.correct||'?')+'</span></div></li>';
            else html += '<li class="lp-item"><div class="q">'+escapeHTML(m.q)+'</div><div>твой: <span class="yours">'+escapeHTML(m.yours||'—')+'</span> → правильно: <span class="correct">'+escapeHTML(m.correct||'—')+'</span></div></li>';
          });
          if (realMisses.length > 6) html += '<li class="lp-item skip"><div class="skip-note">+ ещё '+(realMisses.length-6)+' ошибок в этом разделе</div></li>';
          html += '</ul>';
        }
      });
      const totalPct = totT ? Math.round(totC/totT*100) : 0;
      body.innerHTML = '<div class="lp-total">Общий счёт: <strong>'+totC+' / '+totT+'</strong> · '+totalPct+'% · ошибок: <strong class="miss-n">'+totM+'</strong></div>' + (html || '<div class="lp-good">Пока ничего не сдано. Нажми «📋 Сдать раздел» под нужной секцией.</div>');
      overlay.classList.add('show');
    }

    function saveResult(secId, r){
      try {
        const key = 'lp:' + location.pathname;
        const all = JSON.parse(localStorage.getItem(key) || '{}');
        all[secId] = { total: r.total, correct: r.correct, missCount: r.misses.length, ts: Date.now() };
        localStorage.setItem(key, JSON.stringify(all));
      } catch(e){}
    }

    function escapeHTML(s){
      s = String(s == null ? '' : s);
      return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
  });
})();
