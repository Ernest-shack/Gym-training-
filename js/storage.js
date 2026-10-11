// All data lives on this device in localStorage under one key.
const KEY = 'gym-training.v1';

export const defaultState = () => ({
  version: 1,
  profile: { name: '', goal: 'general', level: 1, minutes: 45, units: 'kg', onboarded: false },
  disabledGear: [],
  history: [],
  active: null,
  program: null,
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    const d = defaultState();
    return { ...d, ...s, profile: { ...d.profile, ...s.profile } };
  } catch {
    return defaultState();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJson(state) {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJson(text) {
  const s = JSON.parse(text);
  if (!s || !Array.isArray(s.history) || !s.profile) throw new Error('This is not a Gym Training backup file.');
  const d = defaultState();
  return { ...d, ...s, profile: { ...d.profile, ...s.profile } };
}
