import { GEAR, gearById } from './data/gear.js';
import { EXERCISES, exerciseById, MUSCLES, PATTERN_LABELS } from './data/exercises.js';
import {
  GOALS, LEVELS, FOCUSES, PROGRAMS, programById, generateWorkout, alternatives, availableExercises,
  buildProgram, nextProgramSession, programSessionWorkout, weekPlan, suggestNext, lastPerformance, e1rm, prescribe,
} from './training.js';
import { load, save, exportJson, importJson, defaultState } from './storage.js';
import { lineChart, barChart, bindCharts } from './charts.js';

let state = load();
const view = document.getElementById('view');
const sheet = document.getElementById('sheet');
const restBar = document.getElementById('rest');

// Draft for the Train screen (not persisted).
let draft = { focus: 'full', minutes: state.profile.minutes, list: null };
let rest = null; // { endsAt, total }

const persist = () => {
  if (!save(state)) toast('Could not save: storage is full or blocked.');
};

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const units = () => state.profile.units;
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDur = (sec) => {
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const speedUnit = () => (units() === 'lb' ? 'mph' : 'km/h');
const distUnit = () => (units() === 'lb' ? 'mi' : 'km');
const REP_UNIT = { time: 's', cardio: 'min' };
const repsLabel = (t) => `${t.reps[0]}–${t.reps[1]} ${REP_UNIT[t.type] || 'reps'}`;
const targetLabel = (t) => `${t.sets} × ${repsLabel(t)}${t.rest ? ` · rest ${t.rest >= 90 ? fmtClock(t.rest) : t.rest + 's'}` : ''}`;
// One logged set as text, e.g. "40 kg × 10 reps", "45 s", "20 min @ 6 km/h".
const fmtSet = (e, s) => {
  if (e.type === 'cardio') return `${s.r} min${Number(s.w) ? ` @ ${s.w} ${speedUnit()}` : ''}`;
  return `${Number(s.w) ? `${s.w} ${units()} × ` : ''}${s.r} ${REP_UNIT[e.type] || 'reps'}`;
};
const muscleList = (ids) => ids.map((m) => MUSCLES[m]).join(', ');
const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
};
const setVolume = (ex, s) => (ex.type === 'weight' || ex.type === 'bw' ? (Number(s.w) || 0) * (Number(s.r) || 0) : 0);

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

const gearThumbs = (ex, size = 'sm') =>
  `<div class="thumbs ${size}">${ex.gear.map((g) => `<img src="${gearById[g].img}" alt="${esc(gearById[g].name)}" loading="lazy">`).join('')}</div>`;

// ---------- stats ----------
function stats() {
  const h = state.history;
  const thisWeek = startOfWeek(Date.now());
  const weekCount = h.filter((w) => new Date(w.date).getTime() >= thisWeek).length;
  const weeks = new Set(h.map((w) => startOfWeek(w.date)));
  let streak = 0;
  let wk = thisWeek;
  if (!weeks.has(wk)) wk -= 7 * 864e5; // the current week isn't over yet
  while (weeks.has(wk)) {
    streak++;
    wk = startOfWeek(wk - 3 * 864e5);
  }
  return { total: h.length, weekCount, streak };
}

// ---------- workout lifecycle ----------
function startWorkout({ title, exercises, programRef = null, note = '' }) {
  if (state.active && !confirm('You already have a workout in progress. Replace it?')) return;
  state.active = {
    id: uid(), title, note, programRef, startedAt: Date.now(),
    exercises: exercises.map(({ exId, target }) => newLogExercise(exId, target)),
  };
  persist();
  location.hash = '#/workout';
}

function newLogExercise(exId, target) {
  const s = suggestNext(state.history, exId, target, units());
  const sets = Array.from({ length: target.sets }, () => ({ w: s ? s.w : '', r: s ? s.r : target.reps[0], done: false }));
  return { exId, target, tip: s ? s.msg : '', sets };
}

function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((x) => ({ exId: x.exId, target: x.target, sets: x.sets.filter((s) => s.done).map(({ w, r }) => ({ w, r, done: true })) }))
    .filter((x) => x.sets.length);
  if (!exercises.length) {
    if (confirm('No sets are ticked off. Discard this workout?')) {
      state.active = null;
      persist();
      location.hash = '#/';
    }
    return;
  }
  const entry = {
    id: a.id, title: a.title, date: new Date(a.startedAt).toISOString(),
    durationSec: Math.round((Date.now() - a.startedAt) / 1000), programRef: a.programRef, exercises,
  };
  state.history.push(entry);
  if (a.programRef && state.program && state.program.templateId === a.programRef.templateId) {
    state.program.completed[`${a.programRef.week}-${a.programRef.day}`] = entry.id;
  }
  state.active = null;
  stopRest();
  persist();
  location.hash = `#/log/${entry.id}`;
  toast('Workout saved. Nice work!');
}

// ---------- rest timer ----------
function startRest(sec) {
  rest = { endsAt: Date.now() + sec * 1000, total: sec };
  tickRest();
}
function stopRest() {
  rest = null;
  restBar.hidden = true;
}
function tickRest() {
  if (!rest) return;
  const left = Math.max(0, (rest.endsAt - Date.now()) / 1000);
  restBar.hidden = false;
  restBar.querySelector('.rest-time').textContent = fmtClock(Math.ceil(left));
  restBar.querySelector('.rest-fill').style.width = `${(left / rest.total) * 100}%`;
  if (left <= 0) {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    toast('Rest is over: next set!');
    stopRest();
  }
}
setInterval(() => {
  tickRest();
  const el = document.getElementById('elapsed');
  if (el && state.active) el.textContent = fmtClock((Date.now() - state.active.startedAt) / 1000);
}, 1000);

// ---------- views ----------
const routes = {
  '': home, train, workout, programs, library, gear: gearPage, ex: exercisePage, log: logPage, progress, settings,
};

function render() {
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (!state.profile.onboarded && name !== 'settings') {
    view.innerHTML = onboarding();
  } else {
    view.innerHTML = (routes[name] || home)(arg ? decodeURIComponent(arg) : undefined);
  }
  document.querySelectorAll('.nav a').forEach((a) => {
    const target = a.getAttribute('href').replace('#/', '');
    const active = target === name || (target === 'library' && (name === 'gear' || name === 'ex')) || (target === 'progress' && name === 'log');
    a.classList.toggle('on', active);
  });
  document.getElementById('resume').hidden = !state.active || name === 'workout';
  bindCharts(view);
  window.scrollTo(0, 0);
}

function onboarding() {
  const p = state.profile;
  return `
  <section class="hero">
    <h1>Welcome to your gym</h1>
    <p class="muted">Set up your profile once. Every workout is built from the equipment in your gym.</p>
  </section>
  <form class="card stack" data-form="profile">
    ${profileFields(p)}
    <button class="btn primary block" type="submit">Let's train</button>
  </form>`;
}

function profileFields(p) {
  const opts = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${String(cur) === k ? 'selected' : ''}>${v}</option>`).join('');
  return `
    <label>Name (optional)<input name="name" value="${esc(p.name)}" autocomplete="given-name"></label>
    <label>Main goal<select name="goal">${opts(GOALS, p.goal)}</select></label>
    <label>Experience<select name="level">${opts(LEVELS, p.level)}</select></label>
    <label>Usual session length<select name="minutes">${opts({ 30: '30 minutes', 45: '45 minutes', 60: '60 minutes', 75: '75 minutes', 90: '90 minutes' }, p.minutes)}</select></label>
    <label>Units<select name="units">${opts({ kg: 'Kilograms (kg)', lb: 'Pounds (lb)' }, p.units)}</select></label>`;
}

function home() {
  const s = stats();
  const p = state.profile;
  const next = state.program && nextProgramSession(state.program);
  const last = state.history[state.history.length - 1];
  let programCard = `
    <div class="card">
      <h2>No program yet</h2>
      <p class="muted">Follow a multi-week plan that adds sets, reps and weight over time.</p>
      <a class="btn" href="#/programs">Browse programs</a>
    </div>`;
  if (state.program) {
    const t = programById[state.program.templateId];
    if (next) {
      const w = programSessionWorkout(state.program, next.week, next.day, p);
      programCard = `
      <div class="card accent">
        <div class="eyebrow">Up next · ${esc(t.name)}</div>
        <h2>Week ${next.week + 1} · ${esc(t.days[next.day].name)}</h2>
        <p class="muted">${esc(w.note)}</p>
        <ul class="mini">${w.exercises.map((x) => `<li>${esc(exerciseById[x.exId].name)} <span>${x.target.sets}×${repsLabel(x.target)}</span></li>`).join('')}</ul>
        <button class="btn primary block" data-action="start-program" data-week="${next.week}" data-day="${next.day}">Start session</button>
      </div>`;
    } else {
      programCard = `<div class="card accent"><h2>${esc(t.name)} complete 🎉</h2><p class="muted">Pick your next program to keep progressing.</p><a class="btn" href="#/programs">Choose next program</a></div>`;
    }
  }
  return `
  <section class="hero">
    <h1>${p.name ? `Hi ${esc(p.name)}` : 'Ready to train?'}</h1>
    <p class="muted">${GOALS[p.goal]} · ${LEVELS[p.level]}</p>
  </section>
  <div class="tiles">
    <div class="tile"><b>${s.weekCount}</b><span>this week</span></div>
    <div class="tile"><b>${s.streak}</b><span>week streak</span></div>
    <div class="tile"><b>${s.total}</b><span>workouts</span></div>
  </div>
  ${programCard}
  <div class="card">
    <h2>Quick workout</h2>
    <p class="muted">Generate a session for today.</p>
    <div class="chips">${Object.entries(FOCUSES).map(([k, f]) => `<button class="chip" data-action="quick" data-focus="${k}">${f.name}</button>`).join('')}</div>
  </div>
  ${last ? `<a class="card link" href="#/log/${last.id}"><div class="eyebrow">Last workout · ${fmtDate(last.date)}</div><h2>${esc(last.title)}</h2><p class="muted">${plural(last.exercises.length, 'exercise')} · ${fmtDur(last.durationSec)}</p></a>` : ''}`;
}

function train() {
  if (!draft.list) regenerate();
  const p = state.profile;
  return `
  <h1>Build a workout</h1>
  <div class="card stack">
    <div><div class="label">Focus</div>
      <div class="chips">${Object.entries(FOCUSES).map(([k, f]) => `<button class="chip ${draft.focus === k ? 'on' : ''}" data-action="focus" data-focus="${k}">${f.name}</button>`).join('')}</div></div>
    <div><div class="label">Time</div>
      <div class="chips">${[20, 30, 45, 60, 75, 90].map((m) => `<button class="chip ${draft.minutes === m ? 'on' : ''}" data-action="minutes" data-min="${m}">${m} min</button>`).join('')}</div></div>
    <p class="muted small">Goal: ${GOALS[FOCUSES[draft.focus].goal || p.goal]} · ${LEVELS[p.level]} · uses only available gear</p>
  </div>
  <div class="row between"><h2>${FOCUSES[draft.focus].name} · ${draft.list.length} exercises</h2><button class="btn ghost" data-action="shuffle">↻ Shuffle</button></div>
  ${draft.list.length ? '' : '<p class="card muted">No exercises match. Turn some gear back on in Settings.</p>'}
  <ol class="exlist">${draft.list.map((x, i) => {
    const ex = exerciseById[x.exId];
    return `<li class="card exrow">
      ${gearThumbs(ex)}
      <div class="grow"><a href="#/ex/${ex.id}"><b>${esc(ex.name)}</b></a><div class="muted small">${targetLabel(x.target)}</div></div>
      <button class="icon" data-action="draft-swap" data-i="${i}" aria-label="Swap exercise">⇄</button>
      <button class="icon" data-action="draft-remove" data-i="${i}" aria-label="Remove exercise">✕</button>
    </li>`;
  }).join('')}</ol>
  <button class="btn ghost block" data-action="draft-add">＋ Add exercise</button>
  <button class="btn primary block" data-action="start-draft" ${draft.list.length ? '' : 'disabled'}>Start workout</button>`;
}

function regenerate() {
  const p = state.profile;
  const last = state.history[state.history.length - 1];
  draft.list = generateWorkout({
    focus: draft.focus, minutes: draft.minutes, goal: p.goal, level: p.level,
    disabledGear: state.disabledGear, avoid: last ? last.exercises.map((x) => x.exId) : [],
  });
}

function workout() {
  const a = state.active;
  if (!a) return `<h1>No workout running</h1><p class="muted">Start one from Home, Train or Programs.</p><a class="btn primary" href="#/train">Build a workout</a>`;
  const done = a.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);
  const total = a.exercises.reduce((n, x) => n + x.sets.length, 0);
  return `
  <div class="row between sticky-head">
    <div><div class="eyebrow">In progress · <span id="elapsed">${fmtClock((Date.now() - a.startedAt) / 1000)}</span></div><h1 class="tight">${esc(a.title)}</h1></div>
    <div class="pill">${done}/${total} sets</div>
  </div>
  ${a.note ? `<p class="note">${esc(a.note)}</p>` : ''}
  ${a.exercises.map((x, i) => workoutCard(x, i)).join('')}
  <button class="btn ghost block" data-action="active-add">＋ Add exercise</button>
  <button class="btn primary block" data-action="finish">Finish workout</button>
  <button class="btn danger-text block" data-action="discard">Discard workout</button>`;
}

function workoutCard(x, i) {
  const ex = exerciseById[x.exId];
  const u = units();
  const wLabel = ex.type === 'cardio' ? speedUnit() : ex.type === 'weight' ? u : `+${u}`;
  const rLabel = { time: 'sec', cardio: 'min' }[ex.type] || 'reps';
  return `
  <article class="card wcard">
    <header class="row">
      ${gearThumbs(ex)}
      <div class="grow"><a href="#/ex/${ex.id}"><b>${esc(ex.name)}</b></a><div class="muted small">${targetLabel(x.target)}</div></div>
      <button class="icon" data-action="active-swap" data-i="${i}" aria-label="Swap exercise">⇄</button>
      <button class="icon" data-action="active-remove" data-i="${i}" aria-label="Remove exercise">✕</button>
    </header>
    ${x.tip ? `<p class="tip">↗ ${esc(x.tip)}</p>` : ''}
    <div class="sets">
      <div class="set head"><span>Set</span><span>${wLabel}</span><span>${rLabel}</span><span></span></div>
      ${x.sets.map((s, j) => `
      <div class="set ${s.done ? 'done' : ''}">
        <span class="n">${j + 1}</span>
        <input inputmode="decimal" type="number" step="any" min="0" placeholder="${{ weight: '0', cardio: 'speed' }[ex.type] || 'BW'}" value="${esc(s.w)}" data-field="w" data-i="${i}" data-j="${j}" aria-label="Set ${j + 1} ${ex.type === 'cardio' ? 'speed' : 'weight'}">
        <input inputmode="numeric" type="number" min="0" value="${esc(s.r)}" data-field="r" data-i="${i}" data-j="${j}" aria-label="Set ${j + 1} ${rLabel}">
        <button class="check" data-action="toggle-set" data-i="${i}" data-j="${j}" aria-label="Mark set ${j + 1} done" aria-pressed="${s.done}">✓</button>
      </div>`).join('')}
    </div>
    <div class="row gap"><button class="btn ghost sm" data-action="add-set" data-i="${i}">＋ Set</button><button class="btn ghost sm" data-action="remove-set" data-i="${i}" ${x.sets.length > 1 ? '' : 'disabled'}>− Set</button></div>
  </article>`;
}

function programs() {
  const p = state.profile;
  let current = '';
  if (state.program) {
    const pr = state.program;
    const t = programById[pr.templateId];
    const next = nextProgramSession(pr);
    const doneCount = Object.keys(pr.completed).length;
    const totalCount = t.weeks * t.days.length;
    current = `
    <div class="card accent">
      <div class="eyebrow">Current program · ${doneCount}/${totalCount} sessions</div>
      <h2>${esc(t.name)}</h2>
      <div class="progress"><i style="width:${(doneCount / totalCount) * 100}%"></i></div>
      <div class="grid-weeks" style="--days:${t.days.length}">
        <span></span>${t.days.map((d) => `<span class="small muted">${esc(d.name)}</span>`).join('')}
        ${Array.from({ length: t.weeks }, (_, w) => `<span class="small muted">W${w + 1}${weekPlan(w, t.weeks).deload ? '·D' : ''}</span>${t.days.map((_, d) => {
          const id = pr.completed[`${w}-${d}`];
          const isNext = next && next.week === w && next.day === d;
          return id ? `<a class="cell done" href="#/log/${id}" aria-label="Week ${w + 1} ${esc(t.days[d].name)} done">✓</a>` : `<span class="cell ${isNext ? 'next' : ''}"></span>`;
        }).join('')}`).join('')}
      </div>
      <p class="muted small">D = deload week. Weeks rise in effort (3 → 2 → 1 reps in reserve), then back off.</p>
      ${next ? `<button class="btn primary block" data-action="start-program" data-week="${next.week}" data-day="${next.day}">Start Week ${next.week + 1} · ${esc(t.days[next.day].name)}</button>` : ''}
    </div>
    ${t.days.map((d, di) => `
    <div class="card">
      <h3>${esc(d.name)} <span class="muted small">· ${FOCUSES[d.focus].name}</span></h3>
      <ul class="plain">${pr.days[di].map((id, k) => {
        const ex = exerciseById[id];
        if (!ex) return '';
        const tg = prescribe(ex, { goal: FOCUSES[d.focus].goal || p.goal, level: p.level });
        return `<li class="exrow">${gearThumbs(ex)}<div class="grow"><a href="#/ex/${id}">${esc(ex.name)}</a><div class="muted small">${tg.sets} × ${repsLabel(tg)} (base week)</div></div><button class="icon" data-action="program-swap" data-d="${di}" data-k="${k}" aria-label="Swap exercise">⇄</button></li>`;
      }).join('')}</ul>
    </div>`).join('')}
    <button class="btn danger-text block" data-action="end-program">End program</button>
    <h2>Other programs</h2>`;
  }
  return `
  <h1>Programs</h1>
  ${current || '<p class="muted">Multi-week plans with built-in progressive overload and deload weeks.</p>'}
  ${PROGRAMS.filter((t) => !state.program || t.id !== state.program.templateId).map((t) => `
    <div class="card">
      <div class="eyebrow">${t.weeks} weeks · ${t.days.length} days/week · ${LEVELS[t.level]}+</div>
      <h2>${esc(t.name)}</h2>
      <p class="muted">${esc(t.blurb)}</p>
      <div class="chips static">${t.days.map((d) => `<span class="chip">${esc(d.name)}</span>`).join('')}</div>
      <button class="btn" data-action="start-template" data-id="${t.id}">Start this program</button>
    </div>`).join('')}`;
}

let libFilter = { q: '', muscle: '' };
function library() {
  const off = new Set(state.disabledGear);
  const q = libFilter.q.toLowerCase();
  const matches = EXERCISES.filter((e) => (!libFilter.muscle || e.primary.includes(libFilter.muscle) || e.secondary.includes(libFilter.muscle)) && (!q || e.name.toLowerCase().includes(q)));
  const showExercises = q || libFilter.muscle;
  return `
  <h1>Library</h1>
  <input class="search" type="search" placeholder="Search ${EXERCISES.length} exercises…" value="${esc(libFilter.q)}" data-field="lib-q" aria-label="Search exercises">
  <div class="chips scroll">${Object.entries(MUSCLES).map(([k, v]) => `<button class="chip ${libFilter.muscle === k ? 'on' : ''}" data-action="lib-muscle" data-m="${k}">${v}</button>`).join('')}</div>
  <div id="lib-results">${showExercises ? exerciseListHtml(matches) : `
  <h2>Your gear</h2>
  <div class="gear-grid">${GEAR.map((g) => `
    <a class="gear ${off.has(g.id) ? 'off' : ''}" href="#/gear/${g.id}">
      <img src="${g.img}" alt="" loading="lazy">
      <span class="no">${g.no}</span>
      <b>${esc(g.name)}</b>
      <small>${plural(EXERCISES.filter((e) => e.gear.includes(g.id)).length, 'exercise')}${off.has(g.id) ? ' · unavailable' : ''}</small>
    </a>`).join('')}</div>`}</div>`;
}

function exerciseListHtml(list) {
  if (!list.length) return '<p class="muted">No exercises found.</p>';
  return `<ul class="plain">${list.map((e) => `<li><a class="exrow card link" href="#/ex/${e.id}">${gearThumbs(e)}<div class="grow"><b>${esc(e.name)}</b><div class="muted small">${muscleList(e.primary)} · ${PATTERN_LABELS[e.pattern]}</div></div><span class="lvl l${e.level}">${LEVELS[e.level]}</span></a></li>`).join('')}</ul>`;
}

function gearPage(id) {
  const g = gearById[id];
  if (!g) return '<p>Gear not found.</p>';
  const off = state.disabledGear.includes(id);
  return `
  <a class="back" href="#/library">‹ Library</a>
  <div class="gear-hero"><img src="${g.img}" alt="${esc(g.name)}"><div><div class="eyebrow">No. ${g.no} · ${esc(g.kind)}</div><h1>${esc(g.name)}</h1>
  <label class="switch"><input type="checkbox" data-field="gear-toggle" data-id="${g.id}" ${off ? '' : 'checked'}> Available</label></div></div>
  <h2>Exercises</h2>
  ${exerciseListHtml(EXERCISES.filter((e) => e.gear.includes(id)))}`;
}

function exercisePage(id) {
  const e = exerciseById[id];
  if (!e) return '<p>Exercise not found.</p>';
  const sessions = state.history.filter((w) => w.exercises.some((x) => x.exId === id));
  const loaded = sessions.some((w) => w.exercises.find((x) => x.exId === id).sets.some((s) => Number(s.w)));
  const series = sessions.map((w) => {
    const sets = w.exercises.find((x) => x.exId === id).sets;
    const best = (f) => Math.max(...sets.map(f));
    let val;
    if (e.type === 'cardio') val = best((s) => ((Number(s.w) || 0) * (Number(s.r) || 0)) / 60);
    else if (e.type === 'time') val = best((s) => Number(s.r) || 0);
    else if (loaded) val = best((s) => e1rm(Number(s.w) || 0, Number(s.r) || 0));
    else val = best((s) => Number(s.r) || 0);
    return { label: fmtDate(w.date), y: Math.round(val * 10) / 10 };
  });
  const metric = e.type === 'cardio' ? `Distance (${distUnit()})`
    : e.type === 'time' ? 'Best set (s)'
    : loaded ? `Estimated 1-rep max (${units()})` : 'Best set (reps)';
  const last = lastPerformance(state.history, id);
  return `
  <a class="back" href="#/library" data-action="back">‹ Back</a>
  <h1>${esc(e.name)}</h1>
  <div class="chips static"><span class="chip">${PATTERN_LABELS[e.pattern]}</span><span class="chip lvl l${e.level}">${LEVELS[e.level]}</span>${e.compound ? '<span class="chip">Compound</span>' : ''}</div>
  <div class="card">
    <p><b>Primary:</b> ${muscleList(e.primary)}${e.secondary.length ? `<br><b>Secondary:</b> ${muscleList(e.secondary)}` : ''}</p>
    <h3>How to</h3>
    <ol class="cues">${e.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
  </div>
  <div class="card"><h3>Gear</h3>${e.gear.map((g) => `<a class="exrow link" href="#/gear/${g}"><img class="thumb" src="${gearById[g].img}" alt=""><span>No. ${gearById[g].no} · ${esc(gearById[g].name)}</span></a>`).join('')}</div>
  <div class="card">
    <h3>Your progress</h3>
    ${series.length >= 2 ? lineChart(series, { label: metric }) : `<p class="muted">${series.length ? 'Log one more session to see a chart.' : 'Not logged yet.'}</p>`}
    ${last ? `<p class="small muted">Last time (${fmtDate(last.date)}): ${last.sets.map((s) => esc(fmtSet(e, s))).join(', ')}</p>` : ''}
  </div>
  <button class="btn primary block" data-action="add-to-active" data-id="${e.id}">${state.active ? 'Add to current workout' : 'Start a workout with this'}</button>`;
}

function logPage(id) {
  const w = state.history.find((x) => x.id === id);
  if (!w) return '<p>Workout not found.</p><a class="btn" href="#/progress">Back</a>';
  const vol = w.exercises.reduce((n, x) => n + x.sets.reduce((m, s) => m + setVolume(exerciseById[x.exId] || {}, s), 0), 0);
  return `
  <a class="back" href="#/progress">‹ Log</a>
  <div class="eyebrow">${fmtDate(w.date)} · ${fmtDur(w.durationSec)}</div>
  <h1>${esc(w.title)}</h1>
  <div class="tiles">
    <div class="tile"><b>${w.exercises.length}</b><span>exercises</span></div>
    <div class="tile"><b>${w.exercises.reduce((n, x) => n + x.sets.length, 0)}</b><span>sets</span></div>
    <div class="tile"><b>${Math.round(vol).toLocaleString()}</b><span>${units()} lifted</span></div>
  </div>
  ${w.exercises.map((x) => {
    const e = exerciseById[x.exId];
    if (!e) return '';
    return `<div class="card"><a href="#/ex/${e.id}"><b>${esc(e.name)}</b></a>
      <div class="muted small">${x.sets.map((s, i) => `Set ${i + 1}: ${esc(fmtSet(e, s))}`).join(' · ')}</div></div>`;
  }).join('')}
  <button class="btn ghost block" data-action="repeat" data-id="${w.id}">Repeat this workout</button>
  <button class="btn danger-text block" data-action="delete-log" data-id="${w.id}">Delete workout</button>`;
}

let progressEx = '';
function progress() {
  const h = state.history;
  const s = stats();
  const now = startOfWeek(Date.now());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = startOfWeek(now - (7 - i) * 7 * 864e5 + 3 * 864e5);
    const count = h.filter((w) => startOfWeek(w.date) === start).length;
    return { label: new Date(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), y: count };
  });
  return `
  <h1>Log</h1>
  <div class="tiles">
    <div class="tile"><b>${s.weekCount}</b><span>this week</span></div>
    <div class="tile"><b>${s.streak}</b><span>week streak</span></div>
    <div class="tile"><b>${s.total}</b><span>total</span></div>
  </div>
  <div class="card"><h3>Workouts per week</h3>${barChart(weeks, { label: 'Workouts' })}</div>
  <h2>History</h2>
  ${h.length ? `<ul class="plain">${h.slice().reverse().map((w) => `<li><a class="card link row between" href="#/log/${w.id}"><div><b>${esc(w.title)}</b><div class="muted small">${fmtDate(w.date)} · ${plural(w.exercises.length, 'exercise')} · ${fmtDur(w.durationSec)}</div></div><span>›</span></a></li>`).join('')}</ul>` : '<p class="muted">Finished workouts show up here.</p>'}`;
}

function settings() {
  const p = state.profile;
  const off = new Set(state.disabledGear);
  return `
  <h1>Settings</h1>
  <form class="card stack" data-form="profile">
    <h2>Profile</h2>
    ${profileFields(p)}
    <button class="btn primary" type="submit">Save profile</button>
  </form>
  <div class="card">
    <h2>Available gear</h2>
    <p class="muted small">Turn off anything that's broken or busy. The generator will skip it.</p>
    <ul class="plain toggles">${GEAR.map((g) => `<li><label class="switch row"><img class="thumb" src="${g.img}" alt=""><span class="grow">${g.no}. ${esc(g.name)}</span><input type="checkbox" data-field="gear-toggle" data-id="${g.id}" ${off.has(g.id) ? '' : 'checked'}></label></li>`).join('')}</ul>
  </div>
  <div class="card stack">
    <h2>Your data</h2>
    <p class="muted small">Everything is stored on this device only. Export a backup now and then.</p>
    <button class="btn" data-action="export">Export backup (.json)</button>
    <label class="btn ghost">Import backup<input type="file" accept="application/json,.json" data-field="import" hidden></label>
    <button class="btn danger-text" data-action="reset">Erase all data</button>
  </div>
  <p class="muted small center">${EXERCISES.length} exercises · ${GEAR.length} pieces of gear</p>`;
}

// ---------- sheet (picker) ----------
function openPicker(title, list, onPick) {
  sheet.innerHTML = `
  <div class="sheet-backdrop" data-action="close-sheet"></div>
  <div class="sheet-body" role="dialog" aria-label="${esc(title)}">
    <div class="row between"><h2>${esc(title)}</h2><button class="icon" data-action="close-sheet" aria-label="Close">✕</button></div>
    <input class="search" type="search" placeholder="Filter…" data-field="sheet-q" aria-label="Filter exercises">
    <ul class="plain">${list.map((e) => `<li data-name="${esc(e.name.toLowerCase())}"><button class="exrow pick" data-action="pick" data-id="${e.id}">${gearThumbs(e)}<span class="grow"><b>${esc(e.name)}</b><span class="muted small block">${muscleList(e.primary)}</span></span></button></li>`).join('')}</ul>
  </div>`;
  sheet.hidden = false;
  openPicker.onPick = onPick;
}
function closeSheet() {
  sheet.hidden = true;
  sheet.innerHTML = '';
}

// ---------- events ----------
const actions = {
  quick(el) {
    draft = { focus: el.dataset.focus, minutes: state.profile.minutes, list: null };
    location.hash = '#/train';
  },
  focus(el) { draft.focus = el.dataset.focus; draft.list = null; render(); },
  minutes(el) { draft.minutes = Number(el.dataset.min); draft.list = null; render(); },
  shuffle() { draft.list = null; render(); },
  'draft-remove'(el) { draft.list.splice(Number(el.dataset.i), 1); render(); },
  'draft-swap'(el) {
    const i = Number(el.dataset.i);
    openPicker('Swap for…', alternatives(draft.list[i].exId, { disabledGear: state.disabledGear, level: state.profile.level }), (id) => {
      draft.list[i] = { exId: id, target: prescribe(exerciseById[id], goalFor(draft.focus)) };
      render();
    });
  },
  'draft-add'() {
    openPicker('Add exercise', availableExercises({ disabledGear: state.disabledGear }), (id) => {
      draft.list.push({ exId: id, target: prescribe(exerciseById[id], goalFor(draft.focus)) });
      render();
    });
  },
  'start-draft'() {
    startWorkout({ title: `${FOCUSES[draft.focus].name} Workout`, exercises: draft.list });
    draft.list = null;
  },
  'start-program'(el) {
    const week = Number(el.dataset.week);
    const day = Number(el.dataset.day);
    const w = programSessionWorkout(state.program, week, day, state.profile);
    startWorkout({ title: w.title, exercises: w.exercises, note: w.note, programRef: { templateId: state.program.templateId, week, day } });
  },
  'start-template'(el) {
    const t = programById[el.dataset.id];
    if (state.program && !confirm(`Replace your current program with ${t.name}? Your logged workouts are kept.`)) return;
    state.program = buildProgram(t.id, state.profile, state.disabledGear);
    persist();
    render();
    toast(`${t.name} started.`);
  },
  'end-program'() {
    if (!confirm('End this program? Your logged workouts are kept.')) return;
    state.program = null;
    persist();
    render();
  },
  'program-swap'(el) {
    const d = Number(el.dataset.d);
    const k = Number(el.dataset.k);
    openPicker('Swap for…', alternatives(state.program.days[d][k], { disabledGear: state.disabledGear, level: state.profile.level }), (id) => {
      state.program.days[d][k] = id;
      persist();
      render();
    });
  },
  'toggle-set'(el) {
    const x = state.active.exercises[Number(el.dataset.i)];
    const s = x.sets[Number(el.dataset.j)];
    s.done = !s.done;
    persist();
    if (s.done) startRest(x.target.rest);
    render();
    restoreScroll(el);
  },
  'add-set'(el) {
    const x = state.active.exercises[Number(el.dataset.i)];
    const prev = x.sets[x.sets.length - 1] || { w: '', r: x.target.reps[0] };
    x.sets.push({ w: prev.w, r: prev.r, done: false });
    persist();
    render();
    restoreScroll(el);
  },
  'remove-set'(el) {
    const x = state.active.exercises[Number(el.dataset.i)];
    if (x.sets.length > 1) x.sets.pop();
    persist();
    render();
    restoreScroll(el);
  },
  'active-remove'(el) {
    const i = Number(el.dataset.i);
    if (!confirm(`Remove ${exerciseById[state.active.exercises[i].exId].name}?`)) return;
    state.active.exercises.splice(i, 1);
    persist();
    render();
  },
  'active-swap'(el) {
    const i = Number(el.dataset.i);
    const cur = state.active.exercises[i];
    openPicker('Swap for…', alternatives(cur.exId, { disabledGear: state.disabledGear }), (id) => {
      state.active.exercises[i] = newLogExercise(id, prescribe(exerciseById[id], state.profile));
      persist();
      render();
    });
  },
  'active-add'() {
    openPicker('Add exercise', availableExercises({ disabledGear: state.disabledGear }), (id) => {
      state.active.exercises.push(newLogExercise(id, prescribe(exerciseById[id], state.profile)));
      persist();
      render();
    });
  },
  'add-to-active'(el) {
    const id = el.dataset.id;
    const target = prescribe(exerciseById[id], state.profile);
    if (state.active) {
      state.active.exercises.push(newLogExercise(id, target));
      persist();
      location.hash = '#/workout';
    } else {
      startWorkout({ title: exerciseById[id].name, exercises: [{ exId: id, target }] });
    }
  },
  back() { if (history.length > 1) history.back(); else location.hash = '#/library'; },
  finish() { finishWorkout(); },
  discard() {
    if (!confirm('Discard this workout? Logged sets will be lost.')) return;
    state.active = null;
    stopRest();
    persist();
    location.hash = '#/';
  },
  repeat(el) {
    const w = state.history.find((x) => x.id === el.dataset.id);
    startWorkout({ title: w.title, exercises: w.exercises.filter((x) => exerciseById[x.exId]).map((x) => ({ exId: x.exId, target: x.target })) });
  },
  'delete-log'(el) {
    if (!confirm('Delete this workout from your log?')) return;
    const id = el.dataset.id;
    state.history = state.history.filter((w) => w.id !== id);
    if (state.program) {
      for (const [k, v] of Object.entries(state.program.completed)) if (v === id) delete state.program.completed[k];
    }
    persist();
    location.hash = '#/progress';
  },
  'lib-muscle'(el) {
    libFilter.muscle = libFilter.muscle === el.dataset.m ? '' : el.dataset.m;
    render();
  },
  'rest-add'() { if (rest) { rest.endsAt += 15000; rest.total += 15; tickRest(); } },
  'rest-skip'() { stopRest(); },
  'close-sheet'() { closeSheet(); },
  pick(el) {
    const cb = openPicker.onPick;
    closeSheet();
    cb(el.dataset.id);
  },
  export() {
    const blob = new Blob([exportJson(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-training-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset() {
    if (!confirm('Erase your profile, programs and every logged workout from this device?')) return;
    state = defaultState();
    persist();
    location.hash = '#/';
    render();
  },
};

const goalFor = (focus) => ({ goal: FOCUSES[focus].goal || state.profile.goal, level: state.profile.level });

// Keep the tapped control in place after a re-render.
function restoreScroll(el) {
  const sel = `[data-action="${el.dataset.action}"][data-i="${el.dataset.i}"]${el.dataset.j ? `[data-j="${el.dataset.j}"]` : ''}`;
  const top = el.getBoundingClientRect().top;
  const again = view.querySelector(sel);
  if (again) window.scrollBy(0, again.getBoundingClientRect().top - top);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || !actions[el.dataset.action]) return;
  ev.preventDefault();
  actions[el.dataset.action](el);
});

document.addEventListener('submit', (ev) => {
  const form = ev.target;
  if (form.dataset.form !== 'profile') return;
  ev.preventDefault();
  const f = new FormData(form);
  const wasOnboarded = state.profile.onboarded;
  state.profile = {
    ...state.profile, name: String(f.get('name') || '').trim().slice(0, 40), goal: f.get('goal'),
    level: Number(f.get('level')), minutes: Number(f.get('minutes')), units: f.get('units'), onboarded: true,
  };
  draft = { focus: draft.focus, minutes: state.profile.minutes, list: null };
  persist();
  if (!wasOnboarded) location.hash = '#/programs';
  render();
  toast(wasOnboarded ? 'Profile saved.' : 'All set! Pick a program, or start a quick workout from Home.');
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  const f = el.dataset.field;
  if (f === 'w' || f === 'r') {
    state.active.exercises[Number(el.dataset.i)].sets[Number(el.dataset.j)][f] = el.value;
    persist();
  } else if (f === 'lib-q') {
    libFilter.q = el.value;
    const pos = el.selectionStart;
    render();
    const again = view.querySelector('[data-field="lib-q"]');
    again.focus();
    again.setSelectionRange(pos, pos);
  } else if (f === 'sheet-q') {
    const q = el.value.toLowerCase();
    sheet.querySelectorAll('li[data-name]').forEach((li) => { li.hidden = !li.dataset.name.includes(q); });
  }
});

document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset.field === 'gear-toggle') {
    const id = el.dataset.id;
    state.disabledGear = el.checked ? state.disabledGear.filter((g) => g !== id) : [...new Set([...state.disabledGear, id])];
    draft.list = null;
    persist();
  } else if (el.dataset.field === 'import' && el.files[0]) {
    try {
      const next = importJson(await el.files[0].text());
      if (!confirm(`Import ${next.history.length} workouts? This replaces the data on this device.`)) return;
      state = next;
      persist();
      render();
      toast('Backup imported.');
    } catch (err) {
      toast(err.message || 'Could not read that file.');
    }
    el.value = '';
  }
});

window.addEventListener('hashchange', () => { closeSheet(); render(); });
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
