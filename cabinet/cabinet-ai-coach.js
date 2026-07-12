/* cabinet-ai-coach.js v1 — Личный AI-наставник на странице кабинета.
   После того как cabinet.js отрендерил student/parent dashboard,
   модуль добавляет блок «🤖 Личный наставник» который:
     1) Берёт имя ученика из NGECabinet (или из data-attr на body)
     2) Тянет историю по `room_id = student-<slug(name)>` из lab_submissions
     3) POST на text.pollinations.ai с этой историей
     4) Inline разбор + персональный план на 2-3 дня
   Без ключей, без credits. Кэш 24 часа в localStorage. */
(function(){
  if (window.__cabinetAiLoaded) return;
  window.__cabinetAiLoaded = true;

  var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";

  function slugify(s){
    return (s||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,30);
  }
  function firstName(full){
    return (full||'').trim().split(/\s+/)[0];
  }

  function injectStyle(){
    if (document.getElementById('cab-ai-style')) return;
    var s = document.createElement('style');
    s.id = 'cab-ai-style';
    s.textContent = ''+
      '.cab-ai{margin:24px 0;padding:22px 24px;border-radius:16px;'+
        'background:linear-gradient(135deg,#1e1a2e 0%,#241c3e 100%);'+
        'border:1px solid #5b3aa8;border-left:4px solid #7c3aed;'+
        'color:#f3eee5;font-family:"Manrope",sans-serif;'+
        'box-shadow:0 8px 32px rgba(124,58,237,.18)}'+
      'body.light .cab-ai{background:linear-gradient(135deg,#fbf8ff 0%,#f0e9ff 100%);'+
        'border-color:#d4c0f7;color:#1a1f2e}'+
      '.cab-ai-h{display:flex;align-items:center;gap:10px;'+
        'font:800 .82rem/1 "JetBrains Mono",monospace;letter-spacing:.16em;'+
        'text-transform:uppercase;color:#c5a3ff;margin-bottom:12px}'+
      'body.light .cab-ai-h{color:#7c3aed}'+
      '.cab-ai-h .dot{width:8px;height:8px;border-radius:50%;background:#7c3aed;'+
        'animation:cabAiPulse 1.4s ease-in-out infinite}'+
      '@keyframes cabAiPulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}'+
      '.cab-ai.done .dot{animation:none;background:#22c55e}'+
      '.cab-ai.fail .dot{animation:none;background:#f59e0b}'+
      '.cab-ai-meta{font:600 .85rem/1.5 "Manrope",sans-serif;color:#c5b8e6;margin-bottom:12px}'+
      'body.light .cab-ai-meta{color:#6b46c1}'+
      '.cab-ai-body{font:500 .94rem/1.65 "Manrope",sans-serif;white-space:pre-wrap;word-wrap:break-word}'+
      '.cab-ai-body strong{color:#d4b5ff;font-weight:800}'+
      'body.light .cab-ai-body strong{color:#5b21b6}'+
      '.cab-ai-body h3,.cab-ai-body h4{margin:14px 0 6px;font:800 .98rem/1.3 "Manrope",sans-serif;color:#c5a3ff}'+
      'body.light .cab-ai-body h3,body.light .cab-ai-body h4{color:#4a2d8a}'+
      '.cab-ai-body em{font-style:normal;color:#e9d6ff;background:#3a2a5e;padding:2px 6px;border-radius:4px}'+
      'body.light .cab-ai-body em{color:#7c3aed;background:#f1e9ff}'+
      '.cab-ai-body ul,.cab-ai-body ol{margin:6px 0 6px 22px;padding:0}'+
      '.cab-ai-body li{margin:4px 0}'+
      '.cab-ai-skel{color:#c5a3ff;font:700 .88rem/1.4 "Manrope",sans-serif}'+
      'body.light .cab-ai-skel{color:#7c3aed}';
    document.head.appendChild(s);
  }

  var SUPA = null;
  function supa(){
    if (SUPA) return SUPA;
    if (!window.supabase) return null;
    SUPA = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return SUPA;
  }

  async function loadSDK(){
    if (window.supabase && window.supabase.createClient) return;
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function cacheKey(roomId){ return 'cab-ai:' + roomId + ':' + (new Date().toISOString().slice(0,10)); }
  function loadCache(k){
    try {
      var raw = localStorage.getItem(k);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (Date.now() - o.ts > 1000*60*60*24) return null;
      return o.text;
    } catch(e){ return null; }
  }
  function saveCache(k, text){
    try { localStorage.setItem(k, JSON.stringify({ ts: Date.now(), text })); } catch(e){}
  }

  async function fetchHistory(roomId){
    var client = supa();
    if (!client) return null;
    var resp = await client.from('lab_submissions')
      .select('lesson_path,section_title,section_id,score,total,student_role,created_at,misses')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(40);
    if (resp.error) throw resp.error;
    return resp.data || [];
  }

  function buildPrompt(student, history){
    var name = firstName(student.name);
    var p = 'Я ученик английского по имени ' + name + '. Это мой персональный кабинет. ';
    p += 'Учитель Мария попросила тебя посмотреть мою активность и дать тёплый персональный разбор.\n\n';
    p += '# Данные\n';
    p += 'Уровень: ' + (student.level || 'не указан') + '\n';
    if (student.notes) p += 'Заметки учителя: ' + String(student.notes).slice(0, 300) + '\n';
    p += '\n# История из Lab за последние записи (' + history.length + '):\n';
    var submits = history.filter(function(r){ return r.section_id !== 'homework-batch'; }).slice(0, 15);
    var hw = history.filter(function(r){ return r.section_id === 'homework-batch'; });
    submits.forEach(function(r){
      var pct = r.total ? Math.round(r.score/r.total*100) : 0;
      var lessonShort = (r.lesson_path||'').replace('/lingua-boost-lab/','').replace(/\/$/,'').slice(0,40);
      p += '- ' + lessonShort + ' / ' + (r.section_title||'?') + ': ' + r.score + '/' + r.total + ' (' + pct + '%)\n';
    });
    if (hw.length){
      p += '\n# Домашка (отправленная учителю):\n';
      hw.slice(0,5).forEach(function(h){
        var items = Array.isArray(h.misses) ? h.misses : [];
        p += '- ' + items.length + ' заданий из ' + (h.lesson_path||'').replace('/lingua-boost-lab/','').replace(/\/$/,'') + '\n';
      });
    }
    p += '\n# Что мне нужно\n' +
         '1) Одна тёплая строка — общее впечатление об активности.\n' +
         '2) **Сильные стороны** — 2-3 пункта что у меня получается.\n' +
         '3) **Над чем работать** — 2-3 пункта где я часто ошибаюсь (с примерами тем).\n' +
         '4) **План на 2-3 дня** — конкретные шаги, по 15 минут в день.\n' +
         'Пиши тёплым тоном, как наставник. Без жаргона. По-русски.';
    return p;
  }

  async function callAI(prompt){
    var body = JSON.stringify({
      messages: [
        { role:'system', content: 'Ты тёплый, точный наставник английского. Не пиши длинно — 6-10 строк. Чётко по структуре. Не упоминай бренды.' },
        { role:'user',   content: prompt }
      ],
      model: 'openai', private: true,
      seed: Math.floor(Math.random()*1e6)
    });
    var resp = await fetch('https://text.pollinations.ai/openai', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: body
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json().catch(async function(){ return { raw: await resp.text() }; });
    var text = data?.choices?.[0]?.message?.content || data?.raw || data?.text || (typeof data === 'string' ? data : '');
    if (!text || !text.trim()) throw new Error('empty');
    return text.trim();
  }

  function renderText(node, raw){
    var html = raw
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/"([^"\n]{1,120})"/g, '<em>"$1"</em>');
    html = html.split(/\n\n+/).map(function(p){
      if (/^#+\s/.test(p)) return '<h4>' + p.replace(/^#+\s/,'') + '</h4>';
      if (/^\s*[-•]\s/m.test(p)) {
        var items = p.split(/\n/).filter(function(l){ return /^\s*[-•]\s/.test(l); }).map(function(l){ return '<li>'+l.replace(/^\s*[-•]\s/,'')+'</li>'; }).join('');
        return '<ul>' + items + '</ul>';
      }
      if (/^\s*\d+[\.)]\s/m.test(p)) {
        var items = p.split(/\n/).filter(function(l){ return /^\s*\d+[\.)]\s/.test(l); }).map(function(l){ return '<li>'+l.replace(/^\s*\d+[\.)]\s+/,'')+'</li>'; }).join('');
        return '<ol>' + items + '</ol>';
      }
      return '<div>' + p.replace(/\n/g,'<br>') + '</div>';
    }).join('');
    node.innerHTML = html;
  }

  async function runForStudent(student, container){
    injectStyle();
    var box = document.createElement('div');
    box.className = 'cab-ai';
    box.innerHTML =
      '<div class="cab-ai-h"><span class="dot"></span><span>ИИ-наставник · персональный разбор</span></div>' +
      '<div class="cab-ai-meta">Готовлю разбор по твоей истории из Lab…</div>' +
      '<div class="cab-ai-skel">⏳ это занимает 5–15 секунд</div>';
    container.appendChild(box);

    var name = firstName(student.name);
    var roomId = 'student-' + slugify(name);
    var key = cacheKey(roomId);
    var cached = loadCache(key);
    if (cached) {
      box.classList.add('done');
      var body = document.createElement('div');
      body.className = 'cab-ai-body';
      renderText(body, cached);
      box.querySelector('.cab-ai-meta').textContent = 'Разбор (из кэша · обновится завтра)';
      box.querySelector('.cab-ai-skel')?.remove();
      box.appendChild(body);
      return;
    }

    try {
      await loadSDK();
      var history = await fetchHistory(roomId);
      if (!history || history.length === 0) {
        box.classList.add('done');
        box.querySelector('.cab-ai-meta').textContent = 'Пока нет данных из Lab. Открой урок, сдай раздел — разбор появится здесь.';
        box.querySelector('.cab-ai-skel')?.remove();
        return;
      }
      var prompt = buildPrompt(student, history);
      var text = await callAI(prompt);
      saveCache(key, text);
      box.classList.add('done');
      box.querySelector('.cab-ai-meta').textContent = 'Разбор по ' + history.length + ' записям';
      box.querySelector('.cab-ai-skel')?.remove();
      var body = document.createElement('div');
      body.className = 'cab-ai-body';
      renderText(body, text);
      box.appendChild(body);
    } catch(e) {
      box.classList.add('fail');
      box.querySelector('.cab-ai-skel').textContent =
        'Разбор сейчас не получается. Попробуй обновить страницу через минуту.';
    }
  }

  // Хук на NGECabinet.renderStudent — wrap чтобы запустить после рендера
  function hookRender(){
    if (!window.NGECabinet) return setTimeout(hookRender, 200);
    if (window.NGECabinet.__aiCoachHooked) return;
    window.NGECabinet.__aiCoachHooked = true;

    var origRenderStudent = window.NGECabinet.renderStudent;
    if (typeof origRenderStudent === 'function') {
      window.NGECabinet.renderStudent = function(container, student){
        var ret = origRenderStudent.apply(this, arguments);
        try { runForStudent(student, container); } catch(e){}
        return ret;
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookRender);
  } else hookRender();
})();
