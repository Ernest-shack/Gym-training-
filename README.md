# Gym Training

A personal gym training app built around the 19 pieces of gear in the gym inventory.
It's an installable, offline-first web app (PWA). No accounts and no server: all data stays on your phone.

## Features

- **Exercise library**: 73 exercises mapped to the 19 machines, each with the muscles worked, form cues, the gear it needs (with pictures from the inventory sheet) and your own progress chart.
- **Workout generator**: pick a focus (Full Body, Upper, Lower, Push, Pull, Legs, Arms & Shoulders, Core, Conditioning) and a time (20–90 min). It builds a balanced session by movement pattern, spreads it across different machines, and avoids repeating your last workout. You can swap, add or remove any exercise.
- **Workout logging**: log weight × reps (or seconds) per set, with a rest timer that vibrates, plus suggestions for your next weight or rep target based on last time (double progression).
- **Multi-week programs**: Full Body Foundations (3×/wk), Upper/Lower (4×/wk), Push/Pull/Legs (3×/wk), Strength + Conditioning (4×/wk). Effort rises in 4-week waves (3 → 2 → 1 reps in reserve, extra set in week 3), then a deload week.
- **Log & progress**: history, workouts-per-week chart, week streak, and an estimated 1-rep max (or best reps/hold) chart for each exercise.
- **Settings**: goal, experience, session length, kg/lb, mark gear as unavailable (the generator skips it), and JSON backup export/import.

## Run it

No build step. Serve the folder with any static server:

```sh
npm start            # python3 -m http.server 8080
# open http://localhost:8080
```

To use it on your phone, host the folder over HTTPS (for example with GitHub Pages: Settings → Pages → deploy from this branch, root folder). Open it in the phone browser, then **Add to Home Screen**. After the first load it works offline.

## Tests

```sh
npm test             # node --test (Node 18+)
```

The tests check the data (every exercise uses real gear, and every machine has exercises), the generator (session length, level, disabled gear, no duplicates), programs, week waves and progression.

## Project layout

```
index.html               app shell
css/styles.css           styles (dark + light)
js/app.js                screens, routing, events
js/training.js           generator, prescriptions, programs, progression (pure functions)
js/charts.js             small SVG line/bar charts
js/storage.js            localStorage persistence, backup import/export
js/data/gear.js          the 19 machines
js/data/exercises.js     exercise library
img/gear/                machine pictures cropped from the inventory sheet
sw.js, manifest.webmanifest, icons/   PWA files
```

## Assumptions about the gear

- **#15 Seated Cable Row** is pictured with an adjustable bench, so that bench is also used flat or inclined for Smith bench press, incline press, overhead press and hip thrusts.
- **#12 Accessory Rack** has kettlebells, medicine/slam balls, a BOSU and a foam roller (no dumbbells).
- **#19 Ab Bench** is a decline sit-up bench.

To add or change exercises, edit `js/data/exercises.js`. `npm test` will catch unknown gear or muscle ids.
If you change any cached file, bump `CACHE` in `sw.js` so installed copies pick up the new version.
