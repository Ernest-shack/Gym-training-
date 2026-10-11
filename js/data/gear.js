// The gym's gear. Items 1–19 match the inventory sheet (pictures cropped from it);
// 20–22 were added later and use simple drawings.
export const GEAR = [
  { id: 'chest-press', no: 1, name: 'Chest Press', kind: 'Plate-loaded machine' },
  { id: 'row-machine', no: 2, name: 'Row Machine', kind: 'Plate-loaded machine' },
  { id: 'pec-deck', no: 3, name: 'Pec Deck / Rear Delt', kind: 'Selectorized machine' },
  { id: 'seated-row', no: 4, name: 'Seated Row', kind: 'Selectorized machine' },
  { id: 'hyperextension', no: 5, name: 'Hyperextension Bench', kind: 'Bench' },
  { id: 'preacher', no: 6, name: 'Preacher Curl Bench', kind: 'Bench' },
  { id: 'smith', no: 7, name: 'Smith Machine', kind: 'Rack' },
  { id: 'plyo', no: 8, name: 'Soft Plyo Boxes', kind: 'Functional' },
  { id: 'bag-trx', no: 9, name: 'Heavy Punching Bag & TRX', kind: 'Functional' },
  { id: 'cable', no: 10, name: 'Cable Station', kind: 'Cable' },
  { id: 'dip-chin', no: 11, name: 'Dip & Chin-Up Station', kind: 'Bodyweight station' },
  { id: 'accessory', no: 12, name: 'Accessory Rack', kind: 'Kettlebells, med balls, BOSU, foam roller' },
  { id: 'lat-pulldown', no: 13, name: 'Lat Pulldown', kind: 'Selectorized machine' },
  { id: 'rig', no: 14, name: 'Functional Rig', kind: 'Functional' },
  { id: 'seated-cable-row', no: 15, name: 'Seated Cable Row', kind: 'Cable' },
  { id: 'ab-crunch', no: 16, name: 'Abdominal Crunch', kind: 'Selectorized machine' },
  { id: 'leg-extension', no: 17, name: 'Leg Extension', kind: 'Selectorized machine' },
  { id: 'leg-curl', no: 18, name: 'Seated Leg Curl', kind: 'Selectorized machine' },
  { id: 'ab-bench', no: 19, name: 'Ab Bench', kind: 'Bench' },
  { id: 'dumbbells', no: 20, name: 'Dumbbells', kind: 'Free weights', ext: 'svg' },
  { id: 'barbell', no: 21, name: 'Barbell & Plates', kind: 'Free weights (no separate rack)', ext: 'svg' },
  { id: 'treadmill', no: 22, name: 'Treadmill', kind: 'Cardio machine', ext: 'svg' },
].map(({ ext = 'jpg', ...g }) => ({ ...g, img: `img/gear/${String(g.no).padStart(2, '0')}.${ext}` }));

export const gearById = Object.fromEntries(GEAR.map((g) => [g.id, g]));
