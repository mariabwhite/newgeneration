/* cabinet-live-feed.js v1 — Встроенная live-лента событий учеников
   на странице учителя. Подписывается на lab-firehose-v1 канал и
   показывает последние ~15 событий компактно. Подкладывается в
   контейнер с id="liveFeedEmbed". Для полноценного дашборда —
   teacher-live (отдельная страница). */
(function(){
  if (window.__cabLiveLoaded) return;
  window.__cabLiveLoaded = true;

  var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";

  function injectStyle(){
    if (document.getElementById('cab-live-style')) return;
    var s = document.createElement('style');
    s.id = 'cab-live-style';
    s.textContent = ''+
      '.cab-live{background:linear-gradient(135deg,#0f1520 0%,#161e2e 100%);'+
        'border:1px solid #27334a;border-radius:14px;padding:18px 20px;margin:0 0 22px;'+
        'color:#f3eee5;font-family:"Manrope",sans-serif}'+
      'body.light .cab-live{background:linear-gradient(135deg,#fafafa 0%,#f3f4f6 100%);'+
        'border-color:#e5e7eb;color:#1a1a2e}'+
      '.cab-live-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px;flex-wrap:wrap}'+
      '.cab-live-h h3{margin:0;font:800 .82rem/1 "JetBrains Mono",monospace;letter-spacing:.16em;'+
        'text-transform:uppercase;color:#fbbf24;display:flex;align-items:center;gap:10px}'+
      '.cab-live-h .dot{width:9px;height:9px;border-radius:50%;background:#fbbf24;'+
        'animation:cabLivePulse 1.6s ease-in-out infinite}'+
      '.cab-live.live .cab-live-h .dot{background:#22c55e}'+
      '.cab-live.fail .cab-live-h .dot{animation:none;background:#ef4444}'+
      '@keyframes cabLivePulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}'+
      '.cab-live-h .status{font:600 .76rem/1 "JetBrains Mono",monospace;letter-spacing:.08em;color:#7a8499}'+
      'body.light .cab-live-h .status{color:#6b7280}'+
      '.cab-live-h .full{font:700 .76rem/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#fbbf24;text-decoration:none;padding:6px 12px;border-radius:8px;background:rgba(251,191,36,.12);transition:background .15s}'+
      '.cab-live-h .full:hover{background:rgba(251,191,36,.22)}'+
      '.cab-live-list{display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto;padding-right:4px}'+
      '.cab-live-list::-webkit-scrollbar{width:6px}'+
      '.cab-live-list::-webkit-scrollbar-thumb{background:#27334a;border-radius:3px}'+
      '.cab-live-evt{display:flex;gap:10px;padding:9px 12px;border-radius:9px;background:#1c2638;border-left:3px solid #f59e0b;animation:cabLiveIn .2s ease-out;align-items:flex-start}'+
      'body.light .cab-live-evt{background:#fff;border-color:#e5e7eb;border-left-color:#f59e0b}'+
      '@keyframes cabLiveIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:translateX(0)}}'+
      '.cab-live-evt.submit{border-left-color:#22c55e}'+
      '.cab-live-evt.open{border-left-color:#a855f7}'+
      '.cab-live-evt.homework{border-left-color:#fbbf24;background:#1f1a0e}'+
      'body.light .cab-live-evt.homework{background:#fef3c7}'+
      '.cab-live-evt .icon{flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:13px}'+
      '.cab-live-evt .body{flex:1;min-width:0;font:600 .85rem/1.4 "Manrope",sans-serif}'+
      '.cab-live-evt .who{font:800 .76rem/1 "JetBrains Mono",monospace;letter-spacing:.05em;color:#fbbf24;display:block;margin-bottom:2px}'+
      'body.light .cab-live-evt .who{color:#92400e}'+
      '.cab-live-evt .msg em{font-style:normal;color:#fbbf24;background:rgba(251,191,36,.16);padding:1px 5px;border-radius:3px}'+
      'body.light .cab-live-evt .msg em{color:#92400e;background:#fef3c7}'+
      '.cab-live-evt .msg .ok{color:#22c55e;font-weight:700}'+
      '.cab-live-evt .msg .bad{color:#ef4444;font-weight:700}'+
      '.cab-live-evt .lp{font:600 .72rem/1.3 "JetBrains Mono",monospace;color:#7a8499;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      'body.light .cab-live-evt .lp{color:#9ca3af}'+
      '.cab-live-evt .ts{font:600 .72rem/1 "JetBrains Mono",monospace;color:#7a8499;flex-shrink:0;align-self:flex-start}'+
      '.cab-live-empty{color:#7a8499;text-align:center;padding:30px 10px;font:500 .85rem/1.5 "Manrope",sans-serif}'+
      '.cab-live-empty .em{font-size:28px;display:block;margin-bottom:8px}';
    document.head.appendChild(s);
  }

  function loadSDK(){
    return new Promise(function(res, rej){
      if (window.supabase && window.supabase.createClient) return res();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function fmtTime(ts){
    var d = new Date(ts || Date.now());
    return d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  }
  function shortLesson(p){
    return (p||'').replace('/lingua-boost-lab/','').replace(/\/$/,'').slice(0,40);
  }
  function displayName(p){
    if (p.name) return p.name;
    if (p.room_id && /^student-/.test(p.room_id)) return p.room_id.replace(/^student-/,'');
    if (p.room_id) return p.room_id;
    return 'аноним';
  }

  function renderEvent(type, p){
    var who = displayName(p);
    var body = '', cssType = 'dom', icon = '⌨';
    if (type === 'lesson-open') {
      body = '<div class="msg">📖 открыл урок <em>' + esc(shortLesson(p.lesson_path)) + '</em></div>';
      cssType = 'open'; icon = '📖';
    } else if (type === 'dom-state') {
      var what = p.kind || 'other';
      var action = '';
      var cls = (p.classes||[]).join(' ');
      if (what === 'gap') action = p.text ? 'вставил <em>«'+esc(p.text)+'»</em> в пропуск' : 'тронул пропуск';
      else if (what === 'mcq') action = 'ответил на тест ' + (/correct|right/.test(cls) ? '<span class="ok">✓</span>' : (/wrong/.test(cls) ? '<span class="bad">✗</span>' : ''));
      else if (what === 'tfns') action = 'T/F/NS ' + (/\bright\b/.test(cls) ? '<span class="ok">✓</span>' : (/\bwrong\b/.test(cls) ? '<span class="bad">✗</span>' : ''));
      else if (what === 'writing') action = p.value ? 'пишет: <em>'+esc(p.value.slice(0,90))+'</em>' : 'начал писать';
      else if (what === 'input') action = p.value ? 'ввёл <em>'+esc(p.value)+'</em>' : 'кликнул';
      else if (what === 'match') action = 'тронул match';
      else if (what === 'mic') action = 'mic-drill';
      else action = cls ? 'действие: <em>'+esc(cls)+'</em>' : 'действие';
      body = '<div class="msg">' + action + '</div>';
    } else if (type === 'section-submit') {
      var pct = p.total ? Math.round(p.score/p.total*100) : 0;
      var v = pct >= 80 ? '<span class="ok">'+p.score+'/'+p.total+' · '+pct+'%</span>' :
              pct >= 50 ? p.score+'/'+p.total+' · '+pct+'%' :
              '<span class="bad">'+p.score+'/'+p.total+' · '+pct+'%</span>';
      body = '<div class="msg">📋 сдал «<em>'+esc(p.section_title||p.section_id||'')+'</em>» '+v+'</div>';
      cssType = 'submit'; icon = '📋';
    } else if (type === 'homework-batch') {
      body = '<div class="msg">📚 отправил домашку <em>'+p.count+' заданий</em></div>';
      cssType = 'homework'; icon = '📚';
    }
    return '<div class="cab-live-evt '+cssType+'">'+
      '<div class="icon">'+icon+'</div>'+
      '<div class="body">'+
        '<span class="who">'+esc(who)+'</span>'+
        body+
        '<div class="lp">'+esc(shortLesson(p.lesson_path))+(p.section_title?' · '+esc(p.section_title):'')+'</div>'+
      '</div>'+
      '<div class="ts">'+fmtTime(p.ts)+'</div>'+
    '</div>';
  }

  var feed = [];
  function pushEvent(type, p){
    feed.unshift({ html: renderEvent(type, p) });
    if (feed.length > 30) feed.length = 30;
    var list = document.querySelector('.cab-live-list');
    if (list) list.innerHTML = feed.map(function(e){ return e.html; }).join('') ||
      '<div class="cab-live-empty"><span class="em">⏳</span>Жду первое событие…</div>';
  }

  function mount(){
    var host = document.getElementById('liveFeedEmbed');
    if (!host) return;
    injectStyle();
    host.innerHTML =
      '<div class="cab-live">'+
        '<div class="cab-live-h">'+
          '<h3><span class="dot"></span> Live · последние действия учеников</h3>'+
          '<span class="status" id="cabLiveStatus">подключаюсь…</span>'+
          '<a href="./teacher-live" class="full">полная лента →</a>'+
        '</div>'+
        '<div class="cab-live-list"><div class="cab-live-empty"><span class="em">⏳</span>Подключаюсь к firehose…</div></div>'+
      '</div>';
    var box = host.querySelector('.cab-live');
    loadSDK().then(function(){
      var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      var ch = client.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
      ch.on('broadcast', { event:'lesson-open' }, function(p){ pushEvent('lesson-open', p.payload); });
      ch.on('broadcast', { event:'dom-state' }, function(p){ pushEvent('dom-state', p.payload); });
      ch.on('broadcast', { event:'section-submit' }, function(p){ pushEvent('section-submit', p.payload); });
      ch.on('broadcast', { event:'homework-batch' }, function(p){ pushEvent('homework-batch', p.payload); });
      ch.subscribe(function(status){
        var st = document.getElementById('cabLiveStatus');
        if (status === 'SUBSCRIBED') { box.classList.add('live'); if (st) st.textContent = 'LIVE'; }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { box.classList.add('fail'); if (st) st.textContent = 'нет связи'; }
      });
      // Timeout fallback
      setTimeout(function(){
        if (!box.classList.contains('live')) {
          box.classList.add('fail');
          var st = document.getElementById('cabLiveStatus');
          if (st) st.textContent = 'не подключилось за 10s';
        }
      }, 10000);
    }).catch(function(){
      box.classList.add('fail');
      var st = document.getElementById('cabLiveStatus');
      if (st) st.textContent = 'SDK не загрузился';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
