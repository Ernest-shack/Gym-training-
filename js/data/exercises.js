// Exercise library: every exercise can be done with the gear in GEAR.
//
// pattern  - movement slot used by the workout generator
// type     - 'weight' (kg/lb x reps), 'bw' (bodyweight reps, optional added load), 'time' (seconds)
// level    - 1 beginner-friendly, 2 intermediate, 3 advanced
// compound - multi-joint lift (gets lower reps / longer rest)

export const MUSCLES = {
  chest: 'Chest', back: 'Back', lats: 'Lats', shoulders: 'Shoulders', rearDelts: 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', quads: 'Quads',
  hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core: 'Core',
  lowerBack: 'Lower back', cardio: 'Conditioning',
};

const ex = (id, name, gear, pattern, primary, o = {}) => ({
  id, name, gear, pattern, primary,
  secondary: o.secondary || [],
  type: o.type || 'weight',
  level: o.level || 1,
  compound: !!o.compound,
  cues: o.cues || [],
});

export const EXERCISES = [
  // 1 Chest Press
  ex('machine-chest-press', 'Machine Chest Press', ['chest-press'], 'hpush', ['chest'], {
    secondary: ['triceps', 'shoulders'], compound: true,
    cues: ['Set the seat so the handles line up with mid-chest', 'Shoulder blades pinned back into the pad', 'Press without locking the elbows hard; control the return'],
  }),
  ex('single-arm-chest-press', 'Single-Arm Chest Press', ['chest-press'], 'hpush', ['chest'], {
    secondary: ['triceps', 'core'], compound: true, level: 2,
    cues: ['Brace your core so your torso does not twist', 'Same seat setup as the two-arm press', 'Do all reps on one side, then switch'],
  }),

  // 2 Row Machine (plate-loaded)
  ex('chest-supported-row', 'Chest-Supported Row', ['row-machine'], 'hpull', ['back', 'lats'], {
    secondary: ['biceps', 'rearDelts'], compound: true,
    cues: ['Chest stays on the pad for the whole set', 'Pull your elbows back past your torso', 'Squeeze your shoulder blades at the end of each rep'],
  }),
  ex('single-arm-machine-row', 'Single-Arm Machine Row', ['row-machine'], 'hpull', ['lats'], {
    secondary: ['biceps', 'rearDelts'], compound: true, level: 2,
    cues: ['Drive the elbow toward your hip', 'Let the shoulder blade stretch forward at the bottom', 'Do not rotate your chest off the pad'],
  }),

  // 3 Pec Deck / Rear Delt
  ex('pec-deck-fly', 'Pec Deck Fly', ['pec-deck'], 'chestIso', ['chest'], {
    secondary: ['shoulders'],
    cues: ['Handles at chest height, slight bend in the elbows', 'Bring the hands together in a hugging arc', 'Slow 2–3 second return'],
  }),
  ex('reverse-pec-deck', 'Reverse Fly (Rear Delt)', ['pec-deck'], 'rearDelt', ['rearDelts'], {
    secondary: ['back'],
    cues: ['Face the pad, arms out in front', 'Lead with the elbows, not the hands', 'Stop when your arms line up with your body; do not shrug'],
  }),

  // 4 Seated Row
  ex('seated-row-machine', 'Seated Row (Machine)', ['seated-row'], 'hpull', ['back', 'lats'], {
    secondary: ['biceps', 'rearDelts'], compound: true,
    cues: ['Sit tall with your chest up', 'Pull the handles to your lower ribs', 'Do not lean back to move the weight'],
  }),
  ex('seated-row-wide', 'Wide-Grip Seated Row', ['seated-row'], 'hpull', ['back', 'rearDelts'], {
    secondary: ['biceps'], compound: true,
    cues: ['Elbows flare to about 60°', 'Pull toward the upper chest', 'Squeeze the upper back hard'],
  }),

  // 5 Hyperextension Bench
  ex('back-extension', 'Back Extension', ['hyperextension'], 'hinge', ['lowerBack', 'glutes'], {
    secondary: ['hamstrings'], type: 'bw',
    cues: ['Pad just below the hip crease', 'Hinge at the hips and keep your back neutral', 'Squeeze your glutes to come up; do not arch your back at the top'],
  }),
  ex('glute-hyperextension', 'Glute-Focused Hyperextension', ['hyperextension'], 'glute', ['glutes'], {
    secondary: ['hamstrings'], type: 'bw',
    cues: ['Turn your feet out and round your upper back slightly', 'Drive up with your glutes', 'Hold a plate or kettlebell to add load'],
  }),
  ex('side-hyperextension', 'Side Hyperextension', ['hyperextension'], 'core', ['core'], {
    type: 'bw', level: 2,
    cues: ['Lie sideways with your hip on the pad', 'Bend down to the side, then lift up', 'Do all reps on one side, then switch'],
  }),

  // 6 Preacher Curl Bench
  ex('preacher-curl', 'Preacher Curl', ['preacher'], 'biceps', ['biceps'], {
    secondary: ['forearms'],
    cues: ['Armpits snug over the top of the pad', 'Lower until your arms are almost straight', 'No bouncing out of the bottom'],
  }),
  ex('cable-preacher-curl', 'Cable Preacher Curl', ['preacher', 'cable'], 'biceps', ['biceps'], {
    level: 2, cues: ['Put the bench in front of a low pulley', 'Keeps tension on the biceps at the bottom of the curl', 'Squeeze for a second at the top'],
  }),
  ex('kb-preacher-curl', 'Single-Arm Kettlebell Preacher Curl', ['preacher', 'accessory'], 'biceps', ['biceps'], {
    secondary: ['forearms'], cues: ['Hold the kettlebell by the handle', 'Slow lowering', 'Do all reps on one arm, then switch'],
  }),

  // 7 Smith Machine
  ex('smith-squat', 'Smith Machine Squat', ['smith'], 'squat', ['quads', 'glutes'], {
    secondary: ['core'], compound: true,
    cues: ['Feet slightly in front of the bar', 'Sit down between your heels, knees track over your toes', 'Brace your core before every rep'],
  }),
  ex('smith-bench', 'Smith Machine Bench Press', ['smith', 'seated-cable-row'], 'hpush', ['chest'], {
    secondary: ['triceps', 'shoulders'], compound: true,
    cues: ['Adjustable bench (from the cable row) flat under the bar; the bar touches your lower chest', 'Elbows at about 45°', 'Always set the safety stops'],
  }),
  ex('smith-incline', 'Smith Machine Incline Press', ['smith', 'seated-cable-row'], 'hpush', ['chest', 'shoulders'], {
    secondary: ['triceps'], compound: true, level: 2,
    cues: ['Use the adjustable bench at 30°', 'Lower the bar to your upper chest', 'Keep your feet planted and your glutes on the bench'],
  }),
  ex('smith-ohp', 'Smith Machine Overhead Press', ['smith', 'seated-cable-row'], 'vpush', ['shoulders'], {
    secondary: ['triceps'], compound: true,
    cues: ['Upright bench with the bar just in front of your face', 'Press straight up and stop just short of lockout', 'Do not arch your lower back'],
  }),
  ex('smith-rdl', 'Smith Machine Romanian Deadlift', ['smith'], 'hinge', ['hamstrings', 'glutes'], {
    secondary: ['lowerBack'], compound: true, level: 2,
    cues: ['Soft knees; push your hips back', 'Bar slides close to your thighs', 'Stop when your hamstrings stretch and your back still stays flat'],
  }),
  ex('smith-split-squat', 'Smith Machine Split Squat', ['smith'], 'lunge', ['quads', 'glutes'], {
    compound: true, level: 2,
    cues: ['Long stance with the bar on your upper back', 'Drop your back knee straight down', 'Do all reps on one leg, then switch'],
  }),
  ex('smith-hip-thrust', 'Smith Machine Hip Thrust', ['smith', 'seated-cable-row'], 'glute', ['glutes'], {
    secondary: ['hamstrings'], compound: true, level: 2,
    cues: ['Upper back on the bench, bar padded across your hips', 'Chin tucked; ribs down', 'Drive through your heels and pause at the top'],
  }),
  ex('smith-calf-raise', 'Smith Machine Calf Raise', ['smith', 'plyo'], 'calves', ['calves'], {
    cues: ['Balls of your feet on a plyo box edge', 'Full stretch at the bottom', '1-second pause at the top'],
  }),
  ex('smith-inverted-row', 'Smith Machine Inverted Row', ['smith'], 'hpull', ['back'], {
    secondary: ['biceps', 'rearDelts', 'core'], type: 'bw', compound: true,
    cues: ['Bar at hip height; body straight like a plank', 'Pull your chest to the bar', 'Raise the bar to make it easier'],
  }),
  ex('smith-shrug', 'Smith Machine Shrug', ['smith'], 'hpull', ['back'], {
    secondary: ['forearms'],
    cues: ['Lift your shoulders straight up to your ears', 'Do not roll your shoulders', 'Pause at the top'],
  }),

  // 8 Soft Plyo Boxes
  ex('box-jump', 'Box Jump', ['plyo'], 'power', ['quads', 'glutes'], {
    secondary: ['cardio'], type: 'bw', level: 2, compound: true,
    cues: ['Swing your arms and jump up', 'Land softly, knees over your toes', 'Step down — do not jump down'],
  }),
  ex('box-step-up', 'Box Step-Up', ['plyo'], 'lunge', ['quads', 'glutes'], {
    type: 'bw', compound: true,
    cues: ['Whole foot on the box', 'Push through the heel on the box', 'Hold kettlebells to add load'],
  }),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', ['plyo'], 'lunge', ['quads', 'glutes'], {
    type: 'bw', level: 2, compound: true,
    cues: ['Rear foot on a low box', 'Lean your torso slightly forward for more glute work', 'Hold kettlebells to add load'],
  }),
  ex('box-squat-goblet', 'Goblet Box Squat', ['plyo', 'accessory'], 'squat', ['quads', 'glutes'], {
    compound: true,
    cues: ['Hold a kettlebell at your chest', 'Sit back to touch the box lightly, then stand', 'Good for learning squat depth'],
  }),

  // 9 Heavy Punching Bag & TRX
  ex('bag-rounds', 'Heavy Bag Rounds', ['bag-trx'], 'conditioning', ['cardio'], {
    secondary: ['shoulders', 'core'], type: 'time',
    cues: ['Wrap your hands or wear gloves', 'Mix jabs, crosses and hooks', 'Keep your guard up and stay on the balls of your feet'],
  }),
  ex('trx-row', 'TRX Row', ['bag-trx'], 'hpull', ['back'], {
    secondary: ['biceps', 'core'], type: 'bw',
    cues: ['Lean back with your body straight', 'Pull your chest to the handles', 'Walk your feet forward to make it harder'],
  }),
  ex('trx-chest-press', 'TRX Chest Press', ['bag-trx'], 'hpush', ['chest'], {
    secondary: ['triceps', 'core'], type: 'bw', compound: true,
    cues: ['Face away from the anchor', 'Lower until your hands are beside your chest', 'Keep a rigid plank'],
  }),
  ex('trx-hamstring-curl', 'TRX Hamstring Curl', ['bag-trx'], 'hamIso', ['hamstrings'], {
    secondary: ['glutes', 'core'], type: 'bw', level: 2,
    cues: ['Heels in the foot cradles, lying on your back', 'Lift your hips and curl your heels to your glutes', 'Keep your hips up the whole set'],
  }),
  ex('trx-y-raise', 'TRX Y-Raise', ['bag-trx'], 'rearDelt', ['rearDelts', 'shoulders'], {
    type: 'bw', cues: ['Arms straight', 'Raise your arms into a Y overhead', 'Light lean; quality over load'],
  }),
  ex('trx-pistol', 'TRX Assisted Pistol Squat', ['bag-trx'], 'lunge', ['quads', 'glutes'], {
    type: 'bw', level: 3, compound: true,
    cues: ['Hold the handles for balance', 'Sit down on one leg, other leg forward', 'Use the arms only as much as you need'],
  }),

  // 10 Cable Station
  ex('cable-fly', 'Cable Fly', ['cable'], 'chestIso', ['chest'], {
    cues: ['Pulleys at shoulder height', 'Slight bend in the elbows, bring the hands together', 'Feel the stretch at the start'],
  }),
  ex('cable-lateral-raise', 'Cable Lateral Raise', ['cable'], 'latRaise', ['shoulders'], {
    cues: ['Low pulley, cable crosses in front of your body', 'Lead with the elbow out to the side', 'Stop at shoulder height'],
  }),
  ex('face-pull', 'Face Pull', ['cable'], 'rearDelt', ['rearDelts'], {
    secondary: ['back'], cues: ['Rope at forehead height', 'Pull to your face and spread the rope apart', 'Finish with your hands beside your ears'],
  }),
  ex('triceps-pushdown', 'Triceps Pushdown', ['cable'], 'triceps', ['triceps'], {
    cues: ['Elbows pinned to your sides', 'Fully straighten your arms', 'Control the way up'],
  }),
  ex('overhead-triceps-ext', 'Overhead Cable Triceps Extension', ['cable'], 'triceps', ['triceps'], {
    level: 2, cues: ['Face away from the pulley, rope behind your head', 'Elbows point forward', 'Deep stretch, then full extension'],
  }),
  ex('cable-curl', 'Cable Curl', ['cable'], 'biceps', ['biceps'], {
    secondary: ['forearms'], cues: ['Low pulley, straight bar or rope', 'Elbows stay still', 'Squeeze at the top'],
  }),
  ex('cable-woodchop', 'Cable Woodchop', ['cable'], 'core', ['core'], {
    cues: ['Rotate from your hips and torso, arms long', 'Pivot your back foot', 'Do all reps on one side, then switch'],
  }),
  ex('pallof-press', 'Pallof Press', ['cable'], 'core', ['core'], {
    cues: ['Stand side-on to the pulley', 'Press your hands straight out and resist the twist', 'Hold 2 seconds per rep'],
  }),
  ex('cable-pull-through', 'Cable Pull-Through', ['cable'], 'hinge', ['glutes', 'hamstrings'], {
    compound: true, cues: ['Rope between your legs, facing away', 'Hinge back, then snap your hips forward', 'Arms just hold on; your hips do the work'],
  }),
  ex('cable-kickback', 'Cable Glute Kickback', ['cable'], 'glute', ['glutes'], {
    cues: ['Ankle strap on a low pulley', 'Kick back and slightly out', 'Do not arch your lower back'],
  }),

  // 11 Dip & Chin-Up Station
  ex('dips', 'Parallel Bar Dips', ['dip-chin'], 'vpush', ['chest', 'triceps'], {
    secondary: ['shoulders'], type: 'bw', level: 2, compound: true,
    cues: ['Lean slightly forward for chest, stay upright for triceps', 'Lower until your shoulders are just below your elbows', 'Shoulders stay down and back'],
  }),
  ex('chin-up', 'Chin-Up', ['dip-chin'], 'vpull', ['lats', 'biceps'], {
    type: 'bw', level: 2, compound: true,
    cues: ['Palms facing you, shoulder width', 'Start each rep from a full hang', 'Chin over the bar'],
  }),
  ex('pull-up', 'Pull-Up', ['dip-chin'], 'vpull', ['lats'], {
    secondary: ['biceps', 'back'], type: 'bw', level: 3, compound: true,
    cues: ['Palms facing away, a bit wider than your shoulders', 'Pull your elbows down to your ribs', 'No kipping'],
  }),
  ex('captains-chair-knee-raise', 'Knee Raise (Captain\'s Chair)', ['dip-chin'], 'core', ['core'], {
    type: 'bw', cues: ['Back against the pad, forearms on the rests', 'Curl your knees up toward your chest', 'Lower slowly — do not swing'],
  }),

  // 12 Accessory Rack (kettlebells, medicine balls, BOSU, foam roller)
  ex('kb-swing', 'Kettlebell Swing', ['accessory'], 'hinge', ['glutes', 'hamstrings'], {
    secondary: ['cardio', 'core'], compound: true, level: 2,
    cues: ['Hike the bell back between your legs', 'Snap your hips; arms just guide the bell', 'Bell floats to chest height'],
  }),
  ex('goblet-squat', 'Kettlebell Goblet Squat', ['accessory'], 'squat', ['quads', 'glutes'], {
    secondary: ['core'], compound: true,
    cues: ['Bell held at your chest, elbows down', 'Sit between your knees', 'Chest stays tall'],
  }),
  ex('kb-farmer-carry', 'Kettlebell Farmer Carry', ['accessory'], 'carry', ['forearms', 'core'], {
    secondary: ['back'], type: 'time',
    cues: ['Heavy bell in each hand', 'Stand tall and take short, quick steps', 'Do not let the bells swing'],
  }),
  ex('med-ball-slam', 'Medicine Ball Slam', ['accessory'], 'conditioning', ['cardio', 'core'], {
    secondary: ['shoulders', 'lats'], type: 'bw',
    cues: ['Reach overhead and rise onto your toes', 'Slam hard with your whole body', 'Use a non-bouncing slam ball'],
  }),
  ex('russian-twist', 'Russian Twist (Med Ball)', ['accessory'], 'core', ['core'], {
    type: 'bw', cues: ['Lean back about 45°', 'Rotate your ribs, not just your arms', 'Lift your feet to make it harder'],
  }),
  ex('bosu-plank', 'BOSU Plank', ['accessory'], 'core', ['core'], {
    secondary: ['shoulders'], type: 'time',
    cues: ['Forearms on the BOSU', 'Squeeze your glutes; ribs down', 'Breathe steadily'],
  }),
  ex('kb-press', 'Half-Kneeling Kettlebell Press', ['accessory'], 'vpush', ['shoulders'], {
    secondary: ['triceps', 'core'], compound: true,
    cues: ['Kneel with the down knee on the same side as the pressing arm', 'Squeeze the glute on the down leg', 'Press up and slightly back'],
  }),
  ex('kb-lateral-raise', 'Kettlebell Lateral Raise', ['accessory'], 'latRaise', ['shoulders'], {
    cues: ['Light bells, held by the handles', 'Raise to shoulder height', 'Slow lowering'],
  }),
  ex('kb-rdl', 'Kettlebell Romanian Deadlift', ['accessory'], 'hinge', ['hamstrings', 'glutes'], {
    compound: true, cues: ['Hips back, bells slide down your thighs', 'Back flat', 'Stand up by squeezing your glutes'],
  }),

  // 13 Lat Pulldown
  ex('lat-pulldown', 'Lat Pulldown', ['lat-pulldown'], 'vpull', ['lats'], {
    secondary: ['biceps', 'back'], compound: true,
    cues: ['Thighs locked under the pads', 'Pull the bar to your upper chest', 'Lead with the elbows, slight lean back'],
  }),
  ex('close-grip-pulldown', 'Close-Grip Pulldown', ['lat-pulldown'], 'vpull', ['lats'], {
    secondary: ['biceps'], compound: true,
    cues: ['Neutral (V) handle', 'Pull to your sternum', 'Full stretch at the top'],
  }),
  ex('straight-arm-pulldown', 'Straight-Arm Pulldown', ['lat-pulldown'], 'vpull', ['lats'], {
    level: 2, cues: ['Stand facing the stack, arms long', 'Sweep the bar down to your thighs', 'Keep your elbows soft but fixed'],
  }),

  // 14 Functional Rig
  ex('rig-pull-up', 'Pull-Up (Rig)', ['rig'], 'vpull', ['lats'], {
    secondary: ['biceps', 'back'], type: 'bw', level: 3, compound: true,
    cues: ['Full hang to chin over the bar', 'Loop a band on the rig for assistance', 'Controlled lowering'],
  }),
  ex('hanging-leg-raise', 'Hanging Leg Raise', ['rig'], 'core', ['core'], {
    type: 'bw', level: 3, cues: ['Hang with your shoulders engaged', 'Lift your legs by tilting your pelvis', 'Bend your knees to make it easier'],
  }),
  ex('dead-hang', 'Dead Hang', ['rig'], 'carry', ['forearms', 'lats'], {
    type: 'time', cues: ['Overhand grip', 'Relax your shoulders gently', 'Builds grip and shoulder mobility'],
  }),
  ex('rig-bag-circuit', 'Bag + Box Conditioning Circuit', ['rig', 'plyo'], 'conditioning', ['cardio'], {
    type: 'time', level: 2,
    cues: ['30 s on the rig bag, 10 step-ups each leg, repeat', 'Keep moving the whole time', 'Steady, hard pace'],
  }),

  // 15 Seated Cable Row (adjustable bench + low pulley)
  ex('seated-cable-row', 'Seated Cable Row', ['seated-cable-row'], 'hpull', ['back', 'lats'], {
    secondary: ['biceps'], compound: true,
    cues: ['Stay tall and do not rock', 'Pull the handle to your belly button', 'Let your shoulder blades stretch forward at the start'],
  }),
  ex('single-arm-cable-row', 'Single-Arm Cable Row', ['seated-cable-row'], 'hpull', ['lats'], {
    secondary: ['biceps', 'core'], compound: true, level: 2,
    cues: ['Rotate slightly into the stretch', 'Elbow to your hip', 'Do all reps on one arm, then switch'],
  }),

  // 16 Abdominal Crunch
  ex('machine-crunch', 'Machine Crunch', ['ab-crunch'], 'core', ['core'], {
    cues: ['Curl your ribs toward your hips', 'Do not pull with your arms', 'Exhale hard at the bottom'],
  }),

  // 17 Leg Extension
  ex('leg-extension', 'Leg Extension', ['leg-extension'], 'quadIso', ['quads'], {
    cues: ['Knee lines up with the machine pivot', 'Pad on your lower shin', 'Pause at the top; slow on the way down'],
  }),
  ex('single-leg-extension', 'Single-Leg Extension', ['leg-extension'], 'quadIso', ['quads'], {
    cues: ['Fixes left/right imbalances', 'Same setup as the two-leg version', 'Start with your weaker leg'],
  }),

  // 18 Seated Leg Curl
  ex('seated-leg-curl', 'Seated Leg Curl', ['leg-curl'], 'hamIso', ['hamstrings'], {
    cues: ['Thigh pad tight', 'Lean your torso slightly forward for a bigger stretch', 'Squeeze your heels under the seat'],
  }),

  // 19 Ab Bench (decline)
  ex('decline-situp', 'Decline Sit-Up', ['ab-bench'], 'core', ['core'], {
    type: 'bw', level: 2, cues: ['Feet hooked under the rollers', 'Curl up one vertebra at a time', 'Hold a med ball to add load'],
  }),
  ex('decline-reverse-crunch', 'Decline Reverse Crunch', ['ab-bench'], 'core', ['core'], {
    type: 'bw', cues: ['Head at the top, holding the handles', 'Curl your hips up off the bench', 'Lower slowly'],
  }),
  ex('decline-russian-twist', 'Decline Russian Twist', ['ab-bench', 'accessory'], 'core', ['core'], {
    type: 'bw', level: 2, cues: ['Sit partway down the decline', 'Rotate a med ball side to side', 'Keep your chest up'],
  }),
];

export const exerciseById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const PATTERN_LABELS = {
  squat: 'Squat', hinge: 'Hinge', lunge: 'Single leg', hpush: 'Horizontal push', vpush: 'Vertical push',
  hpull: 'Horizontal pull', vpull: 'Vertical pull', chestIso: 'Chest isolation', latRaise: 'Side delts',
  rearDelt: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps', quadIso: 'Quad isolation',
  hamIso: 'Hamstring isolation', glute: 'Glutes', calves: 'Calves', core: 'Core', carry: 'Carry / grip',
  power: 'Power', conditioning: 'Conditioning',
};
