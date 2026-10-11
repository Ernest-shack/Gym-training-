import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GEAR, gearById } from '../js/data/gear.js';
import { EXERCISES, MUSCLES, PATTERN_LABELS } from '../js/data/exercises.js';
import {
  FOCUSES, PROGRAMS, generateWorkout, prescribe, buildProgram, nextProgramSession,
  programSessionWorkout, weekPlan, suggestNext, seededRng, exerciseCount, alternatives,
} from '../js/training.js';

const profile = { goal: 'hypertrophy', level: 2, minutes: 60, units: 'kg' };

test('gear list: 19-item inventory plus dumbbells, barbell, treadmill', () => {
  assert.equal(GEAR.length, 22);
  assert.deepEqual(GEAR.map((g) => g.no), Array.from({ length: 22 }, (_, i) => i + 1));
  assert.ok(['dumbbells', 'barbell', 'treadmill'].every((id) => gearById[id]));
});

test('every exercise is valid and every gear item has exercises', () => {
  const ids = new Set();
  for (const e of EXERCISES) {
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
    e.gear.forEach((g) => assert.ok(gearById[g], `${e.id}: unknown gear ${g}`));
    [...e.primary, ...e.secondary].forEach((m) => assert.ok(MUSCLES[m], `${e.id}: unknown muscle ${m}`));
    assert.ok(PATTERN_LABELS[e.pattern], `${e.id}: unknown pattern ${e.pattern}`);
    assert.ok(['weight', 'bw', 'time', 'cardio'].includes(e.type));
    assert.ok(e.cues.length > 0, `${e.id}: missing cues`);
  }
  for (const g of GEAR) assert.ok(EXERCISES.some((e) => e.gear.includes(g.id)), `${g.name} has no exercises`);
});

test('every focus can fill a full session with all gear available', () => {
  for (const focus of Object.keys(FOCUSES)) {
    for (const level of [1, 2, 3]) {
      const w = generateWorkout({ focus, minutes: 60, level, rng: seededRng(level) });
      assert.ok(w.length >= 4, `${focus} L${level}: only ${w.length}`);
      assert.equal(new Set(w.map((x) => x.exId)).size, w.length, 'no duplicate exercises');
    }
  }
});

test('generator respects session length, level and disabled gear', () => {
  assert.equal(generateWorkout({ focus: 'full', minutes: 30, rng: seededRng(1) }).length, exerciseCount(30));
  const disabled = ['smith', 'cable'];
  for (let s = 0; s < 30; s++) {
    const w = generateWorkout({ focus: 'upper', minutes: 90, level: 1, disabledGear: disabled, rng: seededRng(s) });
    for (const x of w) {
      const e = EXERCISES.find((y) => y.id === x.exId);
      assert.ok(e.level <= 1, `${e.id} too advanced`);
      assert.ok(!e.gear.some((g) => disabled.includes(g)), `${e.id} uses disabled gear`);
    }
  }
});

test('alternatives keep the movement pattern', () => {
  const alts = alternatives('lat-pulldown');
  assert.ok(alts.length > 0);
  assert.ok(alts.every((e) => e.pattern === 'vpull' && e.id !== 'lat-pulldown'));
});

test('prescriptions follow goal and level', () => {
  const squat = EXERCISES.find((e) => e.id === 'smith-squat');
  assert.deepEqual(prescribe(squat, { goal: 'strength', level: 2 }).reps, [4, 6]);
  assert.equal(prescribe(squat, { goal: 'strength', level: 1 }).sets, 3);
  assert.equal(prescribe(squat, { goal: 'strength', level: 3 }).sets, 5);
  const plank = EXERCISES.find((e) => e.id === 'bosu-plank');
  assert.equal(prescribe(plank, { goal: 'general' }).type, 'time');
});

test('week plan waves effort and deloads', () => {
  assert.equal(weekPlan(0, 8).rir, 3);
  assert.equal(weekPlan(2, 8).setsDelta, 1);
  assert.ok(weekPlan(3, 8).deload);
  assert.ok(weekPlan(7, 8).deload);
  assert.ok(weekPlan(3, 4).deload);
});

test('programs build, advance and finish', () => {
  for (const t of PROGRAMS) {
    const p = buildProgram(t.id, profile, [], seededRng(7));
    assert.equal(p.days.length, t.days.length);
    p.days.forEach((d) => assert.ok(d.length >= 4));
    assert.deepEqual(nextProgramSession(p), { week: 0, day: 0 });
    p.completed['0-0'] = 'x';
    assert.deepEqual(nextProgramSession(p), { week: 0, day: 1 });
    for (let w = 0; w < t.weeks; w++) for (let d = 0; d < t.days.length; d++) p.completed[`${w}-${d}`] = 'x';
    assert.equal(nextProgramSession(p), null);
    const s = programSessionWorkout(p, 3, 0, profile);
    assert.ok(s.deload);
    assert.ok(s.exercises.every((x) => x.target.sets >= 2));
  }
});

test('double progression: add weight only when all sets hit the top', () => {
  const target = { sets: 3, reps: [8, 12], rest: 90, type: 'weight' };
  const hist = (reps) => [{ date: '2026-01-01', exercises: [{ exId: 'leg-extension', target, sets: reps.map((r) => ({ w: 40, r, done: true })) }] }];
  assert.equal(suggestNext(hist([12, 12, 12]), 'leg-extension', target).w, 42.5);
  assert.equal(suggestNext(hist([12, 12, 12]), 'leg-extension', target, 'lb').w, 45);
  const stay = suggestNext(hist([12, 10, 9]), 'leg-extension', target);
  assert.equal(stay.w, 40);
  assert.equal(stay.r, 12);
  assert.equal(suggestNext([], 'leg-extension', target), null);
});

test('fixed doses override the goal scheme (treadmill)', () => {
  const walk = EXERCISES.find((e) => e.id === 'treadmill-incline-walk');
  const t = prescribe(walk, { goal: 'strength', level: 1 });
  assert.equal(t.sets, 1);
  assert.deepEqual(t.reps, [10, 20]);
  assert.equal(t.type, 'cardio');
  const cardio = generateWorkout({ focus: 'cardio', minutes: 45, level: 1, rng: seededRng(3) });
  assert.equal(EXERCISES.find((e) => e.id === cardio[0].exId).gear[0], 'treadmill');
});

test('cardio progression adds time, then speed', () => {
  const target = { sets: 1, reps: [10, 20], rest: 0, type: 'cardio' };
  const hist = (w, r) => [{ date: '2026-01-01', exercises: [{ exId: 'treadmill-incline-walk', target, sets: [{ w, r, done: true }] }] }];
  assert.deepEqual([suggestNext(hist(5, 12), 'treadmill-incline-walk', target).w, suggestNext(hist(5, 12), 'treadmill-incline-walk', target).r], [5, 14]);
  assert.deepEqual([suggestNext(hist(5, 20), 'treadmill-incline-walk', target).w, suggestNext(hist(5, 20), 'treadmill-incline-walk', target).r], [5.5, 20]);
});
