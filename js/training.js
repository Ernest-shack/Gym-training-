// Training logic: prescriptions, the workout generator, multi-week programs
// and progression suggestions. Pure functions only — no DOM, no storage.
import { EXERCISES, exerciseById } from './data/exercises.js';

export const GOALS = {
  general: 'General fitness',
  hypertrophy: 'Build muscle',
  strength: 'Get stronger',
  endurance: 'Endurance & fat loss',
};
export const LEVELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

export const FOCUSES = {
  full: { name: 'Full Body', slots: ['squat', 'hpush', 'hpull', 'hinge', 'vpull', 'vpush', 'core', 'lunge', 'biceps', 'triceps'] },
  upper: { name: 'Upper Body', slots: ['hpush', 'vpull', 'vpush', 'hpull', 'chestIso', 'latRaise', 'biceps', 'triceps', 'rearDelt'] },
  lower: { name: 'Lower Body', slots: ['squat', 'hinge', 'lunge', 'quadIso', 'hamIso', 'glute', 'calves', 'core'] },
  push: { name: 'Push', slots: ['hpush', 'vpush', 'hpush', 'chestIso', 'latRaise', 'triceps', 'triceps', 'core'] },
  pull: { name: 'Pull', slots: ['vpull', 'hpull', 'vpull', 'rearDelt', 'biceps', 'hpull', 'biceps', 'carry'] },
  legs: { name: 'Legs', slots: ['squat', 'hinge', 'quadIso', 'hamIso', 'lunge', 'calves', 'glute', 'core'] },
  arms: { name: 'Arms & Shoulders', slots: ['biceps', 'triceps', 'latRaise', 'biceps', 'triceps', 'rearDelt', 'carry'] },
  core: { name: 'Core', slots: ['core', 'core', 'carry', 'core', 'core', 'core'] },
  cardio: { name: 'Cardio', slots: ['cardio', 'conditioning', 'core', 'conditioning', 'carry', 'core'], goal: 'endurance' },
  conditioning: { name: 'Conditioning', slots: ['power', 'conditioning', 'hinge', 'conditioning', 'lunge', 'core', 'carry', 'conditioning'], goal: 'endurance' },
};

// Sets / rep range / rest (seconds) per goal.
const SCHEMES = {
  strength: { compound: [4, 4, 6, 150], iso: [3, 8, 10, 75], time: [3, 30, 45, 60] },
  hypertrophy: { compound: [3, 6, 10, 120], iso: [3, 10, 15, 60], time: [3, 30, 45, 45] },
  endurance: { compound: [3, 12, 15, 60], iso: [3, 15, 20, 45], time: [3, 40, 60, 30] },
  general: { compound: [3, 8, 12, 90], iso: [3, 10, 15, 60], time: [3, 30, 45, 45] },
};

export function prescribe(exercise, { goal = 'general', level = 1 } = {}, week = null) {
  if (exercise.dose) {
    const [sets, lo, hi, rest] = exercise.dose;
    return { sets: week && week.deload ? Math.max(1, sets - 1) : sets, reps: [lo, hi], rest, type: exercise.type };
  }
  const scheme = SCHEMES[goal] || SCHEMES.general;
  let sets, lo, hi, rest;
  if (exercise.pattern === 'power') [sets, lo, hi, rest] = [4, 3, 5, 90];
  else if (exercise.id === 'bag-rounds') [sets, lo, hi, rest] = [4, 90, 180, 60];
  else if (exercise.type === 'time') [sets, lo, hi, rest] = scheme.time;
  else [sets, lo, hi, rest] = exercise.compound ? scheme.compound : scheme.iso;

  if (level <= 1) sets = Math.max(2, sets - 1);
  if (level >= 3 && exercise.compound) sets += 1;
  if (week) sets = Math.max(2, sets + week.setsDelta);
  return { sets, reps: [lo, hi], rest, type: exercise.type };
}

// Number of exercises that fit the session length.
export function exerciseCount(minutes) {
  if (minutes <= 20) return 3;
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  if (minutes <= 60) return 6;
  if (minutes <= 75) return 7;
  return 8;
}

export function availableExercises({ disabledGear = [], level = 3 } = {}) {
  const off = new Set(disabledGear);
  return EXERCISES.filter((e) => e.level <= level && e.gear.every((g) => !off.has(g)));
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

/**
 * Build one workout: an ordered list of { exId, target }.
 * avoid: exercise ids to skip when there is an alternative (e.g. last session).
 */
export function generateWorkout({ focus = 'full', minutes = 45, goal = 'general', level = 1, disabledGear = [], avoid = [], rng = Math.random, week = null } = {}) {
  const f = FOCUSES[focus] || FOCUSES.full;
  const pool = availableExercises({ disabledGear, level });
  const avoidSet = new Set(avoid);
  const used = new Set();
  const usedGear = new Set();
  const out = [];
  const want = exerciseCount(minutes);
  const effGoal = f.goal || goal;

  for (const slot of f.slots) {
    if (out.length >= want) break;
    const fits = pool.filter((e) => e.pattern === slot && !used.has(e.id));
    if (!fits.length) continue;
    // Prefer fresh exercises on gear not yet used in this session.
    const tiers = [
      fits.filter((e) => !avoidSet.has(e.id) && !e.gear.some((g) => usedGear.has(g))),
      fits.filter((e) => !avoidSet.has(e.id)),
      fits,
    ];
    const choice = pick(tiers.find((t) => t.length), rng);
    used.add(choice.id);
    choice.gear.forEach((g) => usedGear.add(g));
    out.push({ exId: choice.id, target: prescribe(choice, { goal: effGoal, level }, week) });
  }
  return out;
}

/** Swap one exercise for another of the same movement pattern. */
export function alternatives(exId, { disabledGear = [], level = 3 } = {}) {
  const ex = exerciseById[exId];
  if (!ex) return [];
  return availableExercises({ disabledGear, level }).filter((e) => e.pattern === ex.pattern && e.id !== exId);
}

// ---------- Programs ----------

export const PROGRAMS = [
  {
    id: 'foundations', name: 'Full Body Foundations', weeks: 8, level: 1,
    blurb: 'Three full-body sessions a week. Learn the machines and build a base.',
    days: [{ name: 'Day A', focus: 'full' }, { name: 'Day B', focus: 'full' }, { name: 'Day C', focus: 'full' }],
  },
  {
    id: 'upper-lower', name: 'Upper / Lower Split', weeks: 8, level: 2,
    blurb: 'Four days a week, alternating upper- and lower-body sessions. More volume per muscle.',
    days: [{ name: 'Upper A', focus: 'upper' }, { name: 'Lower A', focus: 'lower' }, { name: 'Upper B', focus: 'upper' }, { name: 'Lower B', focus: 'lower' }],
  },
  {
    id: 'ppl', name: 'Push / Pull / Legs', weeks: 8, level: 2,
    blurb: 'Classic bodybuilding split. Run it 3 days a week, or twice through for 6.',
    days: [{ name: 'Push', focus: 'push' }, { name: 'Pull', focus: 'pull' }, { name: 'Legs', focus: 'legs' }],
  },
  {
    id: 'hybrid', name: 'Strength + Conditioning', weeks: 4, level: 1,
    blurb: 'Two strength days plus bag, box and kettlebell conditioning. Good for fat loss.',
    days: [{ name: 'Strength A', focus: 'full' }, { name: 'Conditioning', focus: 'conditioning' }, { name: 'Strength B', focus: 'full' }, { name: 'Core & Engine', focus: 'core' }],
  },
];
export const programById = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));

/**
 * Weekly progression in 4-week waves: effort rises over 3 weeks (reps in
 * reserve 3 → 2 → 1, with an extra set in week 3), then a deload week.
 */
export function weekPlan(weekIndex, totalWeeks) {
  const pos = weekIndex % 4;
  if (pos === 3 || weekIndex === totalWeeks - 1) {
    return { setsDelta: -1, rir: 4, deload: true, note: 'Deload: about 10% lighter weights and one set fewer. Recover and move well.' };
  }
  const rir = [3, 2, 1][pos];
  return {
    setsDelta: pos === 2 ? 1 : 0, rir, deload: false,
    note: pos === 2 ? 'Peak week: extra set, stop 1 rep short of failure.' : `Stop each set about ${rir} reps short of failure.`,
  };
}

/** Choose a fixed exercise list for every program day (kept for the whole program). */
export function buildProgram(templateId, profile, disabledGear = [], rng = Math.random) {
  const t = programById[templateId];
  const usedByFocus = {};
  const days = t.days.map((d) => {
    const avoid = usedByFocus[d.focus] || [];
    const list = generateWorkout({ focus: d.focus, minutes: profile.minutes, goal: profile.goal, level: profile.level, disabledGear, avoid, rng });
    usedByFocus[d.focus] = avoid.concat(list.map((x) => x.exId));
    return list.map((x) => x.exId);
  });
  return { templateId, startedAt: Date.now(), days, completed: {} };
}

/** The next (week, day) not yet completed, or null when the program is done. */
export function nextProgramSession(program) {
  const t = programById[program.templateId];
  for (let w = 0; w < t.weeks; w++) {
    for (let d = 0; d < t.days.length; d++) {
      if (!program.completed[`${w}-${d}`]) return { week: w, day: d };
    }
  }
  return null;
}

export function programSessionWorkout(program, week, day, profile) {
  const t = programById[program.templateId];
  const plan = weekPlan(week, t.weeks);
  const effGoal = FOCUSES[t.days[day].focus].goal || profile.goal;
  return {
    title: `${t.name} · Week ${week + 1} · ${t.days[day].name}`,
    note: plan.note,
    deload: plan.deload,
    exercises: program.days[day]
      .filter((id) => exerciseById[id])
      .map((exId) => ({ exId, target: prescribe(exerciseById[exId], { goal: effGoal, level: profile.level }, plan) })),
  };
}

// ---------- Progression ----------

export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);

/** Find the most recent logged sets for an exercise. */
export function lastPerformance(history, exId) {
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i].exercises.find((x) => x.exId === exId);
    const sets = item && item.sets.filter((s) => s.done);
    if (sets && sets.length) return { date: history[i].date, sets, target: item.target };
  }
  return null;
}

/**
 * Double progression: once every working set hits the top of the rep range,
 * add weight; otherwise keep the weight and add reps.
 */
export function suggestNext(history, exId, target, units = 'kg') {
  const last = lastPerformance(history, exId);
  if (!last) return null;
  const [lo, hi] = target.reps;
  const topW = Math.max(...last.sets.map((s) => Number(s.w) || 0));
  const working = last.sets.filter((s) => (Number(s.w) || 0) === topW);
  const allTop = working.length > 0 && working.every((s) => (Number(s.r) || 0) >= hi);

  if (target.type === 'cardio') {
    // w = speed, r = minutes: build up time first, then speed.
    const best = last.sets.reduce((a, b) => ((Number(b.w) || 0) * (Number(b.r) || 0) > (Number(a.w) || 0) * (Number(a.r) || 0) ? b : a));
    const speed = Number(best.w) || 0;
    const mins = Number(best.r) || 0;
    if (mins >= hi && speed) return { w: round(speed + 0.5), r: hi, msg: `You did ${hi} min: go 0.5 faster.` };
    return { w: speed || '', r: Math.min(hi, Math.max(lo, mins + 2)), msg: speed ? `Same speed, aim for ${Math.min(hi, Math.max(lo, mins + 2))} min.` : '' };
  }
  if (target.type === 'time') {
    const best = Math.max(...last.sets.map((s) => Number(s.r) || 0));
    return { w: topW || '', r: allTop ? best + 5 : Math.max(lo, best), msg: allTop ? `Hit ${hi}s last time: go for +5s.` : `Last best: ${best}s.` };
  }
  if (target.type === 'bw' && !topW) {
    const best = Math.max(...last.sets.map((s) => Number(s.r) || 0));
    return { w: '', r: Math.min(best + 1, hi + 5), msg: allTop ? 'Top of range hit: add a kettlebell or slow the tempo.' : `Last best: ${best} reps. Beat it by one.` };
  }
  const inc = units === 'lb' ? 5 : 2.5;
  if (allTop) return { w: round(topW + inc), r: lo, msg: `All sets hit ${hi} reps: go up to ${round(topW + inc)} ${units}.` };
  return { w: topW, r: Math.min(hi, Math.max(lo, Math.max(...working.map((s) => Number(s.r) || 0)) + 1)), msg: `Stay at ${topW} ${units} and add reps until you hit ${hi} on every set.` };
}

const round = (n) => Math.round(n * 100) / 100;

/** Seedable RNG (mulberry32) so tests and program builds are reproducible. */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
