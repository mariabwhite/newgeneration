# Codex Prompt — Fill `past-simple-adventure-kids.html` with working exercises

## Context

You are working with a finished **visual skeleton** of an A1 English lesson for kids:
`past-simple-adventure-kids.html` (paper-academic Lab chrome + kids cinematic hero with wave + 6-stop Adventure Route).

The design is **complete and must not be changed**. Visual identity, colour palette, typography, spacing, hero illustration placeholders, route visual, side-stats, bonus-bar, footer — all stay exactly as they are.

Your job is to **fill in the empty exercise sections** (currently `<div class="placeholder-box">…</div>`), **wire up the gamification**, and **plug in the data** so that the page becomes a fully working lesson.

## Hard rules — do NOT break the design

1. **Do not change** any existing CSS variables, classes, or layout structure outside of what's strictly needed for new exercise widgets.
2. **Colour palette is locked:**
   - `--paper #f4efe8` (background)
   - `--ink #0b0b0c` (primary text)
   - `--accent #ff6a1a` (orange — CTA, active rail step, hover)
   - `--plum #5a3da8` (secondary — stop circles, eyebrow, bonus-bar)
   - `--gold #f5c842` (stars only)
   - **NO lilac, NO violet, NO new accent colours.** If you need a new shade, use `color-mix(in srgb, var(--ink) 40%, var(--paper))` etc.
3. **Typography stack stays the same:** Unbounded for display, Manrope for body, JetBrains Mono for labels and uppercase metadata.
4. **Mono UPPERCASE** for all section-sub, chip text, stat-label, bonus-sub, footer.
5. **No new external dependencies.** Pure HTML + CSS + vanilla JS. No frameworks, no icon fonts.
6. **No emojis in headings** (only inline content if absolutely needed).
7. **English-first.** Bilingual Russian via `data-ru`/`data-en` attributes is acceptable but optional for v1.
8. The wave at the bottom of the hero, the dashed SVG route path, the stop circles, the side-stats, the bonus-bar mascot — **all stay**. Do not remove or simplify.

---

## What to build — section by section

### Stop 1 → Section `#sec1` — **Verb Flip Cards** (Market · find – found)

Replace the `<div class="placeholder-box">12 flip cards · grid 4 × 3</div>` with a working flip-card grid.

**Data (12 irregular verbs):**
```js
[
  { base: "find",  past: "found",  ru: "находить" },
  { base: "go",    past: "went",   ru: "идти" },
  { base: "eat",   past: "ate",    ru: "есть" },
  { base: "take",  past: "took",   ru: "брать" },
  { base: "see",   past: "saw",    ru: "видеть" },
  { base: "make",  past: "made",   ru: "делать" },
  { base: "give",  past: "gave",   ru: "давать" },
  { base: "tell",  past: "told",   ru: "говорить" },
  { base: "come",  past: "came",   ru: "приходить" },
  { base: "have",  past: "had",    ru: "иметь" },
  { base: "get",   past: "got",    ru: "получать" },
  { base: "know",  past: "knew",   ru: "знать" }
]
```

**Behaviour:**
- 4×3 grid (`grid-template-columns: repeat(4, 1fr)`, on `@media(max-width:760px)` → `repeat(2,1fr)`).
- Each card: front shows base verb in Unbounded 18px ink; back shows past form in Unbounded 18px accent + Russian gloss in Manrope 12px ink-mute.
- Click toggles `.flipped` (rotateY 180deg, transform-style preserve-3d, perspective on parent).
- Card border follows existing pattern: `1px solid var(--line)`, `border-radius: 14px`, `background: var(--card)`, `box-shadow: var(--shadow-sm)`.
- Counter underneath: `Flipped: 0 / 12` (mono 11px ink-mute).
- When all 12 are flipped → call `completeStop(1)` (defined below).

### Stop 2 → Section `#sec2` — **Drag & Match** (Map Table · take – took)

Replace placeholder with two-column drag-and-match.

**Data:** 6 pairs from the verb list above (use the first 6).
- Left column: base forms in random order (chips, draggable).
- Right column: past forms (drop targets, fixed order).
- HTML5 native drag-and-drop **plus** click-fallback (tap base → tap past target = match).

**Behaviour:**
- On correct drop: zone gets `.matched` (green border `#1d7a39`, `pointer-events: none`).
- On wrong: shake animation + reset.
- "Check" button: not needed — auto-validates on drop.
- "Reset" button next to grid: `reset-btn` style (mono UPPERCASE pill on paper-2).
- When all 6 matched → `completeStop(2)`.

### Stop 3 → Section `#sec3` — **Sentence Builder** (Road · go – went)

Replace placeholder with a tap-words-in-order sentence builder.

**Data — 5 sentences:**
```js
[
  ["Tom","went","to","the","market"],
  ["He","found","a","beautiful","map"],
  ["Tom","took","the","map","home"],
  ["He","told","his","sister","about","it"],
  ["They","made","a","plan","together"]
]
```

**Behaviour:**
- Show words shuffled as chips (paper-2 background, 1px line, mono).
- User taps in order → words move to a target row.
- Tap a word in the target row → returns to the bank.
- "Check" button validates against expected order.
- Correct → green outline + auto-advance after 800ms; Wrong → red outline + jiggle.
- After 5 sentences → `completeStop(3)`.
- Progress indicator: `Sentence 2 of 5` (mono 11px).

### Stop 4 → Section `#sec4` — **Choose the Form** (Camp · eat – ate)

Replace placeholder with multiple-choice list.

**Data — 6 questions:**
```js
[
  { q: "Tom ___ to Spain last summer.",      opts: ["went","go","goes"], ans: 0 },
  { q: "They ___ a delicious meal.",          opts: ["eats","ate","eat"], ans: 1 },
  { q: "She ___ her old friend.",             opts: ["see","seen","saw"], ans: 2 },
  { q: "We ___ a big map.",                   opts: ["got","get","gets"], ans: 0 },
  { q: "Tom ___ his sister the news.",        opts: ["shows","showed","told"], ans: 2 },
  { q: "They ___ the trip was a success.",    opts: ["know","knew","knowed"], ans: 1 }
]
```

**Behaviour:**
- Each question in a `.mc-question` card (paper-2 bg, 1px line, 12px radius).
- 3 buttons per question, mono UPPERCASE.
- Single-select per question.
- "Check All" button at bottom validates all 6.
- Show score: `4 / 6 correct`. Correct → green outline; wrong → red + show correct answer.
- ≥4 correct → `completeStop(4)`.

### Stop 5 → Section `#sec5` — **Type the Past** (Cave · see – saw)

Replace placeholder with input fields.

**Data — 6 verbs:**
```js
[
  { base: "see",   past: "saw" },
  { base: "go",    past: "went" },
  { base: "eat",   past: "ate" },
  { base: "make",  past: "made" },
  { base: "give",  past: "gave" },
  { base: "find",  past: "found" }
]
```

**Behaviour:**
- Each row: `base verb →` + `<input class="forge-input" data-answer="...">`.
- "Check" button validates all 6 (case-insensitive, trim).
- Correct input gets `.correct` (green border + green tint); wrong gets `.wrong` (red).
- Spelling hints: show the correct answer next to wrong inputs.
- ≥4 correct → `completeStop(5)`.

### Stop 6 → Section `#sec6` — **The Story** (Island · make – made)

Replace placeholder with a tappable story.

**Story text:**
> "One morning Tom *(go)* to the market. He *(find)* an old map and *(take)* it home. He *(tell)* his sister, and they *(make)* a plan. They *(go)* to the island. There they *(see)* a strange tree and *(eat)* its sweet fruit. The fruit *(give)* them strength, and they *(know)* — the adventure had begun."

**Behaviour:**
- Render the story as paragraph.
- Each `*(verb)*` becomes a clickable badge in `.story-verb` style (mono uppercase, 12px, paper-2 bg, 2px line).
- Click cycles: base → past → confirmed (green if correct past, red if wrong).
- Counter: `Verbs found: 6 / 9`.
- When all 9 are correct past forms → `completeStop(6)` + trigger **finale** (confetti + "all done" message).

---

## Gamification wiring

Add these helpers in the script block:

```js
// Verb data — single source of truth
const VERBS = [...12 items above];

// Progress state
let completed = new Array(6).fill(false);

function completeStop(n) {
  if (completed[n-1]) return;
  completed[n-1] = true;
  // 1. Mark stop as done
  const stop = document.querySelector(`.stop[data-stop="${n}"]`);
  if (stop) { stop.classList.remove('is-active'); stop.classList.add('is-done'); }
  // 2. Activate next stop
  const next = document.querySelector(`.stop[data-stop="${n+1}"]`);
  if (next) next.classList.add('is-active');
  // 3. Update rail
  const railSteps = document.querySelectorAll('.rail-step');
  railSteps[n-1].classList.remove('is-active');
  railSteps[n-1].classList.add('is-done');
  if (railSteps[n]) railSteps[n].classList.add('is-active');
  // 4. Update done-pill in route-head
  const donePill = document.querySelector('.done-pill');
  const total = completed.filter(Boolean).length;
  if (donePill) donePill.textContent = `${total} / 6 done`;
  // 5. Bump score by +50 per stop, combo +1
  bumpScore(50);
  // 6. Persist
  saveProgress();
  // 7. Finale
  if (total === 6) launchFinale();
}

function bumpScore(delta) {
  const scoreEl = document.getElementById('scoreVal');
  const comboEl = document.getElementById('comboVal');
  let score = parseInt(scoreEl.textContent, 10) || 0;
  let combo = parseInt(comboEl.textContent.replace('×',''), 10) || 1;
  score += delta * combo;
  combo = Math.min(combo + 1, 6);
  scoreEl.textContent = score;
  comboEl.textContent = '×' + combo;
  // Update topbar score chip too
  const topScore = document.querySelector('.topchip:not(.streak)');
  if (topScore) topScore.innerHTML = '<span class="dot"></span>Score ' + score;
}

function saveProgress() {
  try {
    localStorage.setItem('lba1-past-simple-kids', JSON.stringify({
      completed,
      score: parseInt(document.getElementById('scoreVal').textContent, 10) || 0,
      combo: document.getElementById('comboVal').textContent
    }));
  } catch(_){}
}

function loadProgress() {
  try {
    const raw = localStorage.getItem('lba1-past-simple-kids');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.completed) && data.completed.length === 6) {
      completed = data.completed;
      // Re-mark stops
      completed.forEach((done, i) => {
        if (done) {
          const stop = document.querySelector(`.stop[data-stop="${i+1}"]`);
          if (stop) stop.classList.add('is-done');
          const railStep = document.querySelectorAll('.rail-step')[i];
          if (railStep) { railStep.classList.remove('is-active'); railStep.classList.add('is-done'); }
        }
      });
      const total = completed.filter(Boolean).length;
      if (total > 0 && total < 6) {
        const next = document.querySelector(`.stop[data-stop="${total+1}"]`);
        if (next) next.classList.add('is-active');
        const nextRail = document.querySelectorAll('.rail-step')[total];
        if (nextRail) nextRail.classList.add('is-active');
      }
      document.getElementById('scoreVal').textContent = data.score || 0;
      document.getElementById('comboVal').textContent = data.combo || '×1';
      const donePill = document.querySelector('.done-pill');
      if (donePill) donePill.textContent = `${total} / 6 done`;
    }
  } catch(_){}
}

function launchFinale() {
  // Confetti canvas overlay (paper + plum + accent + gold particles)
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  canvas.width = innerWidth; canvas.height = innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#ff6a1a','#5a3da8','#f5c842','#0b0b0c'];
  const pieces = Array.from({length:140},()=>({
    x: Math.random()*canvas.width,
    y: -20 - Math.random()*canvas.height,
    r: 3+Math.random()*5,
    color: colors[Math.floor(Math.random()*colors.length)],
    vy: 2+Math.random()*3,
    vx: (Math.random()-0.5)*1.5,
    spin: (Math.random()-0.5)*.2,
    angle: 0
  }));
  let frame = 0;
  function tick(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.angle += p.spin;
    });
    if (++frame < 260) requestAnimationFrame(tick);
    else canvas.remove();
  }
  tick();
  // Optional: show a centred completion banner
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
});
```

---

## Optional bilingual layer

If feasible, add `data-ru`/`data-en` attributes to:
- Section titles + subs
- Hero lead, eyebrow, chips
- Bonus-bar title + desc
- Stop strong + small labels

And update the existing `langtoggle` click handler to swap content via:
```js
document.querySelectorAll('[data-ru],[data-en]').forEach(el => {
  el.textContent = el.dataset[next];
});
```

If too risky for v1 — leave English only, remove the toggle button or keep it cosmetic.

---

## Required `<link>` for shared mobile CSS

The lesson lives at `lingua-boost-lab/<level>/past-simple-adventure-kids.html` (when shipped).
Add right before `</head>`:
```html
<link rel="stylesheet" href="../assets/mobile-fix.css?v=1" data-tag="linguaboost-mobile-fix-loaded">
<script defer src="../assets/touch-dnd.js?v=1"></script>
```
(`touch-dnd.js` is required because Stop 2 uses HTML5 drag-and-drop.)

---

## Acceptance criteria

A reviewer should be able to:

1. Open the page in Chrome/Safari/Firefox — visual identity matches the source skeleton 1:1.
2. Click through all 6 stops one by one. Each stop, when completed, marks itself green, lights the rail, advances the next stop's `is-active`.
3. Topbar score chip + sidebar Score / Combo update in real time.
4. Refresh the page — progress restores from localStorage.
5. After Stop 6 — confetti animation runs.
6. Mobile (≤760px) — route reflows to 3 cols, side-stats becomes horizontal, hero stacks left→right→top→bottom.
7. JS passes `node --check` (no syntax errors).
8. No `console.error` on load.
9. **No CSS file outside the existing `<style>` block.** All new exercise CSS is added inside the same `<style>`.

---

## Output

Modify `past-simple-adventure-kids.html` in place. Keep a backup copy as `past-simple-adventure-kids_original.html` in the same folder before any edits.

When done, write a short `_changes.md` next to the file describing what was added (what classes, what data, what handlers).

End of brief.
