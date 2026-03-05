/**
 * Workout CSV parsing, 1RM calculation, TOP 25 mapping, barbell math, and projection.
 * Strong app export: Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, RPE
 */

const CUTOFF_DATE = '2025-11-01'
const CUTOFF_TIME = new Date(CUTOFF_DATE).getTime()

/** TOP 25+ in importance order. Barbell and dumbbell variants are separate exercises. */
const TOP_25 = [
  { rank: 1, canonical: 'Squats (barbell)', keywords: ['squat (barbell)', 'squat (smith'] },
  { rank: 2, canonical: 'Squats (dumbbell)', keywords: ['squat (dumbbell)', 'goblet squat', 'goblet squat (kettlebell)'] },
  { rank: 3, canonical: 'Hack squat', keywords: ['hack squat'] },
  { rank: 4, canonical: 'Leg press', keywords: ['leg press'] },
  { rank: 5, canonical: 'Pull ups', keywords: ['pull up', 'pull-up', 'lat pulldown'] },
  { rank: 6, canonical: 'Incline bench press (barbell)', keywords: ['incline bench press (barbell)'] },
  { rank: 7, canonical: 'Incline bench press (dumbbell)', keywords: ['incline bench press (dumbbell)'] },
  { rank: 8, canonical: 'Romanian Deadlifts', keywords: ['romanian deadlift'] },
  { rank: 9, canonical: 'T-bar rows', keywords: ['t bar row', 'seated row (cable)', 'bent over one arm row', 'incline row', 'iso-lateral row'] },
  { rank: 10, canonical: 'Lateral raises', keywords: ['lateral raise'] },
  { rank: 11, canonical: 'Preacher curls', keywords: ['preacher curl', 'cable curl'] },
  { rank: 12, canonical: 'Bicep curl (barbell)', keywords: ['bicep curl (barbell)'] },
  { rank: 13, canonical: 'Bicep curl (dumbbell)', keywords: ['bicep curl (dumbbell)'] },
  { rank: 14, canonical: 'Overhead cable triceps extensions', keywords: ['triceps extension', 'overhead extension'] },
  { rank: 15, canonical: 'Leg extensions', keywords: ['leg extension'] },
  { rank: 16, canonical: 'Seated leg curls', keywords: ['seated leg curl', 'leg curl (machine)'] },
  { rank: 17, canonical: 'Bench press (barbell)', keywords: ['bench press (barbell)'] },
  { rank: 18, canonical: 'Bench press (dumbbell)', keywords: ['bench press (dumbbell)'] },
  { rank: 19, canonical: 'Walking lunges', keywords: ['lunge (dumbbell)', 'lunge (bodyweight)', 'bulgarian split squat', 'step-up', 'side lunge'] },
  { rank: 20, canonical: 'Overhead press', keywords: ['seated overhead press', 'arnold press', 'shoulder press (plate loaded)'] },
  { rank: 21, canonical: 'Deadlift', keywords: ['deadlift (barbell)', 'sumo deadlift'] },
  { rank: 22, canonical: 'Bayesian cable curls', keywords: ['cable curl', 'bayesian'] },
  { rank: 23, canonical: 'Nautilus glute drive/hip thrust', keywords: ['hip thrust', 'glute bridge', 'glute kickback'] },
  { rank: 24, canonical: 'Weighted dips', keywords: ['dip'] },
  { rank: 25, canonical: 'Reverse pec deck', keywords: ['reverse pec deck', 'reverse fly'] },
  { rank: 26, canonical: 'Machine pec deck', keywords: ['pec deck', 'chest fly'] },
  { rank: 27, canonical: 'Cable crunch', keywords: ['cable crunch', 'crunch'] },
  { rank: 28, canonical: 'Neck curls/extensions', keywords: ['neck curl'] },
  { rank: 29, canonical: 'Dumbbell wrist curls/extensions', keywords: ['wrist curl'] },
  { rank: 30, canonical: 'Standing calf raise', keywords: ['calf raise'] },
  { rank: 31, canonical: 'Dumbbell shrugs', keywords: ['shrug'] },
  { rank: 32, canonical: 'Machine lat pullover', keywords: ['lat pullover', 'pullover'] },
]

/** Muscle groups for balance visualization. Order determines display order in charts. */
export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms', 'Neck',
]

/** Group metadata: id, label, icon key for SVG. */
export const MUSCLE_GROUP_INFO = {
  Chest: { id: 'Chest', label: 'Chest', icon: 'chest' },
  Back: { id: 'Back', label: 'Back', icon: 'back' },
  Shoulders: { id: 'Shoulders', label: 'Shoulders', icon: 'shoulders' },
  Biceps: { id: 'Biceps', label: 'Biceps', icon: 'biceps' },
  Triceps: { id: 'Triceps', label: 'Triceps', icon: 'triceps' },
  Quads: { id: 'Quads', label: 'Quads', icon: 'quads' },
  Hamstrings: { id: 'Hamstrings', label: 'Hamstrings', icon: 'hamstrings' },
  Glutes: { id: 'Glutes', label: 'Glutes', icon: 'glutes' },
  Calves: { id: 'Calves', label: 'Calves', icon: 'calves' },
  Core: { id: 'Core', label: 'Core', icon: 'core' },
  Forearms: { id: 'Forearms', label: 'Forearms', icon: 'forearms' },
  Neck: { id: 'Neck', label: 'Neck', icon: 'neck' },
}

/**
 * Volume weights for balance: stronger/larger muscles can handle more volume, so we weight
 * so that "share of volume" reflects relative load. Weights > 1 = smaller muscles (count more);
 * < 1 = larger muscles (count less). Used for week-over-week % and optional bar weighting.
 */
export const MUSCLE_VOLUME_WEIGHTS = {
  Chest: 1,
  Back: 0.95,
  Shoulders: 1.1,
  Biceps: 1.4,
  Triceps: 1.25,
  Quads: 0.85,
  Hamstrings: 1,
  Glutes: 0.95,
  Calves: 1.35,
  Core: 1,
  Forearms: 1.3,
  Neck: 1.2,
}

/** Subcategories within each group (for finer balance view). groupId matches MUSCLE_GROUPS. */
export const MUSCLE_SUBCATEGORIES = [
  { id: 'upper_chest', label: 'Upper chest', groupId: 'Chest' },
  { id: 'mid_chest', label: 'Mid chest', groupId: 'Chest' },
  { id: 'lower_chest', label: 'Lower chest', groupId: 'Chest' },
  { id: 'lats', label: 'Lats', groupId: 'Back' },
  { id: 'upper_back', label: 'Upper back', groupId: 'Back' },
  { id: 'lower_back', label: 'Lower back', groupId: 'Back' },
  { id: 'traps', label: 'Traps', groupId: 'Back' },
  { id: 'front_delts', label: 'Front delts', groupId: 'Shoulders' },
  { id: 'side_delts', label: 'Side delts', groupId: 'Shoulders' },
  { id: 'rear_delts', label: 'Rear delts', groupId: 'Shoulders' },
  { id: 'biceps', label: 'Biceps', groupId: 'Biceps' },
  { id: 'triceps', label: 'Triceps', groupId: 'Triceps' },
  { id: 'quads', label: 'Quads', groupId: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings', groupId: 'Hamstrings' },
  { id: 'glutes', label: 'Glutes', groupId: 'Glutes' },
  { id: 'calves', label: 'Calves', groupId: 'Calves' },
  { id: 'core', label: 'Core', groupId: 'Core' },
  { id: 'forearms', label: 'Forearms', groupId: 'Forearms' },
  { id: 'neck', label: 'Neck', groupId: 'Neck' },
]

/** Map canonical exercise to subcategory ids (each set counts toward each listed subcategory). */
export const EXERCISE_TO_SUBCATEGORIES = {
  'Squats (barbell)': ['quads', 'glutes'],
  'Squats (dumbbell)': ['quads', 'glutes'],
  'Hack squat': ['quads'],
  'Leg press': ['quads', 'glutes'],
  'Pull ups': ['lats', 'biceps'],
  'Incline bench press (barbell)': ['upper_chest', 'triceps', 'front_delts'],
  'Incline bench press (dumbbell)': ['upper_chest', 'triceps', 'front_delts'],
  'Romanian Deadlifts': ['hamstrings', 'glutes', 'lower_back'],
  'T-bar rows': ['upper_back', 'lats', 'biceps'],
  'Lateral raises': ['side_delts'],
  'Preacher curls': ['biceps'],
  'Bicep curl (barbell)': ['biceps'],
  'Bicep curl (dumbbell)': ['biceps'],
  'Overhead cable triceps extensions': ['triceps'],
  'Leg extensions': ['quads'],
  'Seated leg curls': ['hamstrings'],
  'Bench press (barbell)': ['mid_chest', 'triceps', 'front_delts'],
  'Bench press (dumbbell)': ['mid_chest', 'triceps', 'front_delts'],
  'Walking lunges': ['quads', 'glutes'],
  'Overhead press': ['front_delts', 'side_delts', 'triceps'],
  'Deadlift': ['lower_back', 'lats', 'hamstrings', 'glutes'],
  'Bayesian cable curls': ['biceps'],
  'Nautilus glute drive/hip thrust': ['glutes', 'hamstrings'],
  'Weighted dips': ['lower_chest', 'triceps'],
  'Reverse pec deck': ['rear_delts', 'upper_back'],
  'Machine pec deck': ['mid_chest'],
  'Cable crunch': ['core'],
  'Neck curls/extensions': ['neck'],
  'Dumbbell wrist curls/extensions': ['forearms'],
  'Standing calf raise': ['calves'],
  'Dumbbell shrugs': ['traps'],
  'Machine lat pullover': ['lats', 'mid_chest'],
}

/** Map canonical exercise name to primary muscle groups (each set counts toward each listed group). */
export const EXERCISE_TO_MUSCLES = {
  'Squats (barbell)': ['Quads', 'Glutes'],
  'Squats (dumbbell)': ['Quads', 'Glutes'],
  'Hack squat': ['Quads'],
  'Leg press': ['Quads', 'Glutes'],
  'Pull ups': ['Back', 'Biceps'],
  'Incline bench press (barbell)': ['Chest', 'Triceps', 'Shoulders'],
  'Incline bench press (dumbbell)': ['Chest', 'Triceps', 'Shoulders'],
  'Romanian Deadlifts': ['Hamstrings', 'Glutes', 'Back'],
  'T-bar rows': ['Back', 'Biceps'],
  'Lateral raises': ['Shoulders'],
  'Preacher curls': ['Biceps'],
  'Bicep curl (barbell)': ['Biceps'],
  'Bicep curl (dumbbell)': ['Biceps'],
  'Overhead cable triceps extensions': ['Triceps'],
  'Leg extensions': ['Quads'],
  'Seated leg curls': ['Hamstrings'],
  'Bench press (barbell)': ['Chest', 'Triceps', 'Shoulders'],
  'Bench press (dumbbell)': ['Chest', 'Triceps', 'Shoulders'],
  'Walking lunges': ['Quads', 'Glutes'],
  'Overhead press': ['Shoulders', 'Triceps'],
  'Deadlift': ['Back', 'Hamstrings', 'Glutes'],
  'Bayesian cable curls': ['Biceps'],
  'Nautilus glute drive/hip thrust': ['Glutes', 'Hamstrings'],
  'Weighted dips': ['Chest', 'Triceps'],
  'Reverse pec deck': ['Shoulders', 'Back'],
  'Machine pec deck': ['Chest'],
  'Cable crunch': ['Core'],
  'Neck curls/extensions': ['Neck'],
  'Dumbbell wrist curls/extensions': ['Forearms'],
  'Standing calf raise': ['Calves'],
  'Dumbbell shrugs': ['Back'],
  'Machine lat pullover': ['Back', 'Chest'],
}

const OLYMPIC_BAR_LB = 45
const PLATES_LB = [2.5, 5, 10, 25, 45]
// All totals assume Olympic bar (45 lb). 1 plate = 45 lb per side = 135 lb total (bench/squat/deadlift).
// Bar, 25 per side, 1 plate, 1 plate + 25, 2 plates, 2+25, 3 plates, 3+25, 4 plates, 4+25, 5 plates
const PLATE_MILESTONES = [45, 95, 135, 185, 225, 275, 315, 365, 405, 455, 495]

/** Human-readable labels (Olympic bar: 1 plate = 135 lb total, 2 plates = 225 lb, etc.) */
const PLATE_LABELS = {
  45: 'Bar (45 lb)',
  95: '25 (95 lb)',
  135: '1 plate (135 lb)',
  185: '1 + 25 (185 lb)',
  225: '2 plates (225 lb)',
  275: '2 + 25 (275 lb)',
  315: '3 plates (315 lb)',
  365: '3 + 25 (365 lb)',
  405: '4 plates (405 lb)',
  455: '4 + 25 (455 lb)',
  495: '5 plates (495 lb)',
}

/**
 * Parse CSV with quoted fields. Returns { headers, rows } where each row is array of values.
 */
function parseCSVRows(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (row.length > 0) rows.push(row)
  }
  return { headers, rows }
}

function parseCSVLine(line) {
  const row = []
  let current = ''
  let inQuotes = false
  for (let j = 0; j < line.length; j++) {
    const char = line[j]
    const nextChar = line[j + 1]
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        j++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  row.push(current.trim().replace(/^"|"$/g, ''))
  return row
}

/**
 * Map CSV exercise name to TOP 25 canonical (or null). First matching keyword wins by rank order.
 */
function mapToCanonical(exerciseName) {
  if (!exerciseName || typeof exerciseName !== 'string') return null
  const lower = exerciseName.toLowerCase().trim()
  for (const entry of TOP_25) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return { canonical: entry.canonical, rank: entry.rank }
    }
  }
  return null
}

function isBarbell(canonicalOrExerciseName) {
  const s = (canonicalOrExerciseName || '').toLowerCase()
  if (s.includes('barbell')) return true
  return /t bar|deadlift|romanian deadlift|sumo deadlift|squat.*smith|hip thrust/.test(s)
}

/**
 * Round weight to nearest achievable with Olympic bar + plates (per side).
 */
export function roundToBarbell(weightLb) {
  if (weightLb <= 0 || weightLb < OLYMPIC_BAR_LB) return OLYMPIC_BAR_LB
  const load = weightLb - OLYMPIC_BAR_LB
  if (load <= 0) return OLYMPIC_BAR_LB
  const perSide = load / 2
  const step = 2.5
  const roundedPerSide = Math.round(perSide / step) * step
  return OLYMPIC_BAR_LB + 2 * roundedPerSide
}

/** Plate sizes for display (lb), largest first. */
const PLATES_DISPLAY = [45, 25, 10, 5, 2.5]

/**
 * Get plate load breakdown for a total weight (Olympic bar + plates per side).
 * Returns { total, perSide } where perSide is an array of plate weights per side, e.g. [45, 25] = one 45 and one 25 per side.
 */
export function getPlateLoad(weightLb) {
  if (weightLb == null || weightLb < OLYMPIC_BAR_LB) return null
  const total = roundToBarbell(weightLb)
  const load = total - OLYMPIC_BAR_LB
  if (load <= 0) return { total, bar: OLYMPIC_BAR_LB, perSide: [] }
  let perSideLb = load / 2
  const perSide = []
  for (const p of PLATES_DISPLAY) {
    while (perSideLb >= p - 0.01) {
      perSide.push(p)
      perSideLb -= p
    }
  }
  return { total, bar: OLYMPIC_BAR_LB, perSide }
}

/** Canonical exercise names that use plate-loaded stacks (no barbell). Show plate viz with no bar. */
export const PLATE_LOADED_MACHINES = new Set(['Leg press'])

/**
 * Get plate breakdown for total weight with no bar (e.g. leg press). Returns { total, bar: 0, perSide }.
 */
export function getPlateLoadNoBar(weightLb) {
  if (weightLb == null || weightLb < 0) return null
  const step = 2.5
  const total = Math.round(Number(weightLb) / step) * step
  if (total <= 0) return { total: 0, bar: 0, perSide: [] }
  let perSideLb = total / 2
  const perSide = []
  for (const p of PLATES_DISPLAY) {
    while (perSideLb >= p - 0.01) {
      perSide.push(p)
      perSideLb -= p
    }
  }
  return { total, bar: 0, perSide }
}

/** Common dumbbell sizes (lb) per hand, largest first. Used for dumbbell load visualization. */
export const DUMBBELL_SIZES_LB = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 2.5]

/**
 * Get dumbbell load for display. weightLb is per hand. Rounds to nearest 2.5, then decomposes
 * into common dumbbell sizes. Returns { dumbbell: true, perHand, sizes } where sizes is an array of weights per hand (e.g. [25, 5] = 25 + 5 lb).
 */
export function getDumbbellLoad(weightLb) {
  if (weightLb == null || weightLb < 0) return null
  const step = 2.5
  const perHand = Math.round(Number(weightLb) / step) * step
  if (perHand <= 0) return { dumbbell: true, perHand: 0, sizes: [] }
  let remaining = perHand
  const sizes = []
  for (const s of DUMBBELL_SIZES_LB) {
    while (remaining >= s - 0.01) {
      sizes.push(s)
      remaining -= s
    }
  }
  return { dumbbell: true, perHand, sizes }
}

function epley1RM(weight, reps) {
  if (!weight || !reps || reps < 1) return null
  return weight * (1 + reps / 30)
}

/**
 * Convert estimated 1RM to weight at n reps (inverse Epley).
 * For 1RM pass reps=1 and we return oneRM as-is (no conversion).
 */
export function oneRMToRepWeight(oneRM, reps) {
  if (!Number.isFinite(oneRM) || oneRM <= 0) return null
  if (reps === 1) return oneRM
  if (!Number.isFinite(reps) || reps < 1) return oneRM
  return oneRM / (1 + reps / 30)
}

/**
 * Parse workout CSV, filter date >= Nov 2025, return structured data for charts and suggestions.
 * Returns: { exercisesByRank, seriesByExercise, lastSetByExercise, lastWorkoutSetsByExercise, barbellExercises }
 */
export function processWorkoutCSV(csvText) {
  const { headers, rows } = parseCSVRows(csvText)
  const dateIdx = headers.findIndex((h) => h.toLowerCase() === 'date')
  const exerciseIdx = headers.findIndex((h) => h.toLowerCase() === 'exercise name')
  const weightIdx = headers.findIndex((h) => h.toLowerCase() === 'weight')
  const repsIdx = headers.findIndex((h) => h.toLowerCase() === 'reps')
  const setOrderIdx = headers.findIndex((h) => h.toLowerCase().replace(/\s/g, '') === 'setorder')
  if (dateIdx === -1 || exerciseIdx === -1 || weightIdx === -1 || repsIdx === -1) {
    return {
      exercisesByRank: [],
      seriesByExercise: {},
      lastSetByExercise: {},
      lastWorkoutSetsByExercise: {},
      setHistoryByExercise: {},
      setsByExerciseByDate: {},
      barbellExercises: new Set(),
    }
  }

  const seriesByExercise = {}
  const lastSetByExercise = {}
  /** canonical -> dateKey -> [{ setOrder, weight, reps }] */
  const setsByExerciseByDate = {}
  const barbellExercises = new Set()

  for (const row of rows) {
    const dateStr = row[dateIdx]
    if (!dateStr) continue
    const date = new Date(dateStr)
    if (date.getTime() < CUTOFF_TIME) continue
    const dateKey = date.toISOString().slice(0, 10)
    const exerciseName = row[exerciseIdx]
    const weight = parseFloat(row[weightIdx])
    const reps = parseFloat(row[repsIdx])
    const setOrder = setOrderIdx >= 0 ? parseInt(row[setOrderIdx], 10) : 1
    if (!exerciseName || !Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) continue

    const mapped = mapToCanonical(exerciseName)
    const canonical = mapped ? mapped.canonical : exerciseName
    const rank = mapped ? mapped.rank : 999

    const oneRM = epley1RM(weight, reps)
    if (!oneRM) continue

    if (!seriesByExercise[canonical]) {
      seriesByExercise[canonical] = { rank, points: [], rawName: exerciseName }
    }
    const points = seriesByExercise[canonical].points
    const existing = points.find((p) => p.date === dateKey)
    if (existing) {
      if (oneRM > existing.oneRM) {
        existing.oneRM = oneRM
        existing.weight = weight
        existing.reps = reps
      }
    } else {
      points.push({ date: dateKey, oneRM, weight, reps })
    }
    points.sort((a, b) => a.date.localeCompare(b.date))

    if (!lastSetByExercise[canonical] || dateKey >= lastSetByExercise[canonical].date) {
      lastSetByExercise[canonical] = { date: dateKey, weight, reps, oneRM }
    }
    if (isBarbell(exerciseName) || isBarbell(canonical) || (canonical && canonical.toLowerCase().includes('barbell'))) barbellExercises.add(canonical)

    if (!setsByExerciseByDate[canonical]) setsByExerciseByDate[canonical] = {}
    if (!setsByExerciseByDate[canonical][dateKey]) setsByExerciseByDate[canonical][dateKey] = []
    setsByExerciseByDate[canonical][dateKey].push({
      setOrder: Number.isFinite(setOrder) ? setOrder : setsByExerciseByDate[canonical][dateKey].length + 1,
      weight,
      reps,
    })
  }

  /** For each canonical, last workout = all sets from the most recent date. */
  const lastWorkoutSetsByExercise = {}
  /** For each canonical, per set order: [{ date, weight, reps }, ...] sorted by date (for growth-based next set). */
  const setHistoryByExercise = {}
  for (const [canonical, byDate] of Object.entries(setsByExerciseByDate)) {
    const dates = Object.keys(byDate).sort()
    if (dates.length === 0) continue
    const lastDate = dates[dates.length - 1]
    const sets = [...byDate[lastDate]].sort((a, b) => a.setOrder - b.setOrder)
    lastWorkoutSetsByExercise[canonical] = { date: lastDate, sets }
    setHistoryByExercise[canonical] = {}
    for (const d of dates) {
      for (const { setOrder, weight, reps } of byDate[d]) {
        const so = Number.isFinite(setOrder) ? setOrder : 1
        if (!setHistoryByExercise[canonical][so]) setHistoryByExercise[canonical][so] = []
        setHistoryByExercise[canonical][so].push({ date: d, weight, reps })
      }
    }
    for (const so of Object.keys(setHistoryByExercise[canonical])) {
      setHistoryByExercise[canonical][so].sort((a, b) => a.date.localeCompare(b.date))
    }
  }

  const exercisesByRank = Object.entries(seriesByExercise)
    .map(([name, data]) => ({ name, ...data, sessionCount: data.points.length }))
    .sort((a, b) => b.sessionCount - a.sessionCount)

  return {
    exercisesByRank,
    seriesByExercise,
    lastSetByExercise,
    lastWorkoutSetsByExercise,
    setHistoryByExercise,
    setsByExerciseByDate,
    barbellExercises,
  }
}

/**
 * Simple linear regression: y = slope * x + intercept (x = days since first date).
 * Returns { slope, intercept, firstDate } or null.
 */
export function linearRegression(points) {
  if (!points || points.length < 2) return null
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = sorted[0].date
  const firstTime = new Date(firstDate).getTime()
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0
  const n = sorted.length
  for (const p of sorted) {
    const x = (new Date(p.date).getTime() - firstTime) / (1000 * 60 * 60 * 24)
    const y = p.oneRM
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }
  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept, firstDate, firstTime }
}

/**
 * Project date when 1RM will reach goal (linear model). Returns ISO date string or null.
 */
export function projectDateToReach(regression, goal1RM) {
  if (!regression || regression.slope <= 0) return null
  const daysNeeded = (goal1RM - regression.intercept) / regression.slope
  const ms = regression.firstTime + daysNeeded * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Generate projected points for chart (e.g. next 90 days).
 * First point is at last date (d=0) so the projected line starts with no break.
 */
export function projectedPoints(points, regression, numDays = 90) {
  if (!regression || !points.length) return []
  const last = points[points.length - 1]
  const lastTime = new Date(last.date).getTime()
  const result = []
  for (let d = 0; d <= numDays; d += 7) {
    const t = lastTime + d * 24 * 60 * 60 * 1000
    const dateStr = new Date(t).toISOString().slice(0, 10)
    const daysFromFirst = (t - regression.firstTime) / (1000 * 60 * 60 * 24)
    const oneRM = regression.slope * daysFromFirst + regression.intercept
    if (oneRM > 0) result.push({ date: dateStr, oneRM: Math.round(oneRM * 10) / 10, projected: true })
  }
  return result
}

/**
 * Get plate-milestone points for the chart: each milestone 1RM that is either (a) already achieved,
 * or (b) projected to be reached within the window. Returns [{ date, goal1RM }].
 * points: optional array of { date, oneRM } (actual data) so we can show achieved milestones at the date they were hit.
 */
export function getMilestoneDots(regression, milestones, lastPointDate, numDays = 90, points = null) {
  const result = []
  const lastTime = lastPointDate ? new Date(lastPointDate).getTime() : 0
  const endTime = lastTime + numDays * 24 * 60 * 60 * 1000

  for (const goal1RM of milestones) {
    if (points && points.length > 0) {
      const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
      const firstReached = sorted.find((p) => p.oneRM >= goal1RM)
      if (firstReached) {
        result.push({ date: firstReached.date, goal1RM })
        continue
      }
    }
    if (regression && regression.slope > 0 && lastPointDate) {
      const dateStr = projectDateToReach(regression, goal1RM)
      if (!dateStr) continue
      const t = new Date(dateStr).getTime()
      if (t >= lastTime && t <= endTime) result.push({ date: dateStr, goal1RM })
    }
  }
  return result
}

/**
 * Get sorted list of dates that have at least one set.
 */
export function getWorkoutDates(setsByExerciseByDate) {
  if (!setsByExerciseByDate || typeof setsByExerciseByDate !== 'object') return []
  const set = new Set()
  for (const byDate of Object.values(setsByExerciseByDate)) {
    if (byDate && typeof byDate === 'object') {
      for (const dateKey of Object.keys(byDate)) set.add(dateKey)
    }
  }
  return [...set].sort()
}

/**
 * Get volume (weight × reps) per muscle group for a single date.
 * exerciseToMuscles: optional map canonical -> string[]; defaults to EXERCISE_TO_MUSCLES.
 */
export function getMuscleVolumeForDate(setsByExerciseByDate, dateKey, exerciseToMuscles = EXERCISE_TO_MUSCLES) {
  if (!setsByExerciseByDate || !dateKey || !exerciseToMuscles) return {}
  const out = {}
  for (const [canonical, byDate] of Object.entries(setsByExerciseByDate)) {
    const sets = byDate[dateKey]
    if (!sets || !Array.isArray(sets)) continue
    const muscles = exerciseToMuscles[canonical]
    if (!muscles || muscles.length === 0) continue
    for (const { weight, reps } of sets) {
      const vol = Number(weight) * Number(reps)
      if (!Number.isFinite(vol)) continue
      for (const m of muscles) {
        out[m] = (out[m] || 0) + vol
      }
    }
  }
  return out
}

/**
 * Get volume per muscle group for a date range (inclusive).
 * weekStartDate, weekEndDate: ISO date strings (YYYY-MM-DD).
 */
export function getMuscleVolumeForWeek(setsByExerciseByDate, weekStartDate, weekEndDate, exerciseToMuscles = EXERCISE_TO_MUSCLES) {
  if (!setsByExerciseByDate || !weekStartDate || !weekEndDate || !exerciseToMuscles) return {}
  const out = {}
  for (const [canonical, byDate] of Object.entries(setsByExerciseByDate)) {
    const muscles = exerciseToMuscles[canonical]
    if (!muscles || muscles.length === 0) continue
    for (const dateKey of Object.keys(byDate)) {
      if (dateKey < weekStartDate || dateKey > weekEndDate) continue
      const sets = byDate[dateKey]
      if (!sets || !Array.isArray(sets)) continue
      for (const { weight, reps } of sets) {
        const vol = Number(weight) * Number(reps)
        if (!Number.isFinite(vol)) continue
        for (const m of muscles) {
          out[m] = (out[m] || 0) + vol
        }
      }
    }
  }
  return out
}

/**
 * Get volume per muscle subcategory for a single date.
 * Uses EXERCISE_TO_SUBCATEGORIES; returns { subcategoryId: volume }.
 */
export function getMuscleVolumeForDateBySubcategory(setsByExerciseByDate, dateKey, exerciseToSub = EXERCISE_TO_SUBCATEGORIES) {
  if (!setsByExerciseByDate || !dateKey || !exerciseToSub) return {}
  const out = {}
  for (const [canonical, byDate] of Object.entries(setsByExerciseByDate)) {
    const sets = byDate[dateKey]
    if (!sets || !Array.isArray(sets)) continue
    const subIds = exerciseToSub[canonical]
    if (!subIds || subIds.length === 0) continue
    for (const { weight, reps } of sets) {
      const vol = Number(weight) * Number(reps)
      if (!Number.isFinite(vol)) continue
      for (const id of subIds) {
        out[id] = (out[id] || 0) + vol
      }
    }
  }
  return out
}

/**
 * Get volume per muscle subcategory for a date range (inclusive).
 */
export function getMuscleVolumeForWeekBySubcategory(setsByExerciseByDate, weekStartDate, weekEndDate, exerciseToSub = EXERCISE_TO_SUBCATEGORIES) {
  if (!setsByExerciseByDate || !weekStartDate || !weekEndDate || !exerciseToSub) return {}
  const out = {}
  for (const [canonical, byDate] of Object.entries(setsByExerciseByDate)) {
    const subIds = exerciseToSub[canonical]
    if (!subIds || subIds.length === 0) continue
    for (const dateKey of Object.keys(byDate)) {
      if (dateKey < weekStartDate || dateKey > weekEndDate) continue
      const sets = byDate[dateKey]
      if (!sets || !Array.isArray(sets)) continue
      for (const { weight, reps } of sets) {
        const vol = Number(weight) * Number(reps)
        if (!Number.isFinite(vol)) continue
        for (const id of subIds) {
          out[id] = (out[id] || 0) + vol
        }
      }
    }
  }
  return out
}

/** Get calendar week (Mon–Sun) containing dateStr. Returns { weekStart, weekEnd } as YYYY-MM-DD. */
export function getWeekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const monOffset = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + monOffset)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    weekStart: mon.toISOString().slice(0, 10),
    weekEnd: sun.toISOString().slice(0, 10),
  }
}

/** Get sorted list of unique week-start dates (Mondays) that contain at least one workout. */
export function getWeeksWithData(setsByExerciseByDate) {
  const dates = getWorkoutDates(setsByExerciseByDate)
  const weekStarts = new Set()
  for (const d of dates) {
    const { weekStart } = getWeekBounds(d)
    weekStarts.add(weekStart)
  }
  return [...weekStarts].sort()
}

/**
 * Suggest next weight/reps for progressive overload. Returns { weight, reps, label }.
 */
export function suggestNext(canonical, lastSet, isBarbellExercise) {
  if (!lastSet) return null
  let { weight, reps } = lastSet
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null
  weight = Number(weight)
  reps = Number(reps)
  const plusOneRep = { weight, reps: reps + 1, label: `${weight} lb × ${reps + 1} reps` }
  const increment = isBarbellExercise ? 5 : 2.5
  const nextWeight = isBarbellExercise ? roundToBarbell(weight + increment) : weight + increment
  const plusWeight = { weight: nextWeight, reps: Math.max(1, reps - 1), label: `${nextWeight} lb × ${Math.max(1, reps - 1)} reps` }
  return { primary: plusOneRep, secondary: plusWeight }
}

/** Rep threshold at which we suggest bumping weight (higher target % = lower threshold = bump sooner). Kept for possible future use. */
function repThresholdForTargetPercent(targetPercent) {
  if (targetPercent >= 2.5) return 6
  if (targetPercent >= 1.5) return 8
  if (targetPercent >= 1) return 9
  return 10
}

/**
 * Default rep ranges for progressive overload: when you hit the top of a range, add weight and drop to repsAfterBump.
 * Each range: { low, high, bumpAt, repsAfterBump }.
 */
export const DEFAULT_REP_RANGES = [
  { low: 1, high: 5, bumpAt: 5, repsAfterBump: 5 },
  { low: 6, high: 8, bumpAt: 8, repsAfterBump: 6 },
  { low: 9, high: 10, bumpAt: 10, repsAfterBump: 8 },
  { low: 11, high: 12, bumpAt: 12, repsAfterBump: 10 },
]

/**
 * Find which rep range current reps falls into. Returns that range or the last one if reps > all highs.
 */
export function getRepRangeForReps(reps, ranges = DEFAULT_REP_RANGES) {
  const r = Number(reps)
  if (!Number.isFinite(r)) return ranges[ranges.length - 1]
  for (const range of ranges) {
    if (r >= range.low && r <= range.high) return range
  }
  if (r < ranges[0].low) return ranges[0]
  return ranges[ranges.length - 1]
}

/**
 * Suggest next workout from last session's sets. Uses same number of sets next time.
 * If setHistoryForExercise is provided (per set order: [{ date, weight, reps }, ...]), next set is based on
 * growth rate from previous sessions; otherwise uses +1 rep and rep-range bump rules.
 * repRanges: optional array of { low, high, bumpAt, repsAfterBump }; defaults to DEFAULT_REP_RANGES.
 * Returns { setSuggestions, session1RMCurrent, session1RMNext, percentIncrease }.
 */
export function suggestNextWorkout(lastWorkoutSets, isBarbell, targetPercentIncrease = 1, repRanges = DEFAULT_REP_RANGES, setHistoryForExercise = null) {
  if (!lastWorkoutSets || !lastWorkoutSets.sets || lastWorkoutSets.sets.length === 0) return null
  const sets = lastWorkoutSets.sets
  const increment = isBarbell ? 5 : 2.5

  let session1RMCurrent = 0
  const setSuggestions = sets.map((s, i) => {
    const setOrder = s.setOrder != null ? s.setOrder : i + 1
    const { weight, reps } = s
    const e1RM = epley1RM(weight, reps)
    if (e1RM) session1RMCurrent = Math.max(session1RMCurrent, e1RM)

    const range = getRepRangeForReps(reps, repRanges)
    const bumpAtReps = range.bumpAt
    const repsAfterBump = range.repsAfterBump
    const nextWeight = isBarbell ? roundToBarbell(weight + increment) : weight + increment

    let nextWeightSuggested = weight
    let nextReps = reps + 1
    let useGrowth = false
    const history = setHistoryForExercise && setHistoryForExercise[setOrder]
    if (history && history.length >= 2) {
      const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
      const prev = sorted[sorted.length - 2]
      const last = sorted[sorted.length - 1]
      if (last.weight === prev.weight) {
        const repGrowth = last.reps - prev.reps
        if (repGrowth > 0 && last.reps < bumpAtReps) {
          nextReps = last.reps + repGrowth
          useGrowth = true
        } else if ((repGrowth === 0 || last.reps >= bumpAtReps) && last.reps >= bumpAtReps) {
          nextWeightSuggested = nextWeight
          nextReps = repsAfterBump
          useGrowth = true
        }
      } else if (last.weight > prev.weight) {
        nextReps = last.reps + 1
        useGrowth = true
      }
    }
    if (!useGrowth) {
      if (reps >= bumpAtReps) {
        nextWeightSuggested = nextWeight
        nextReps = repsAfterBump
      } else {
        nextReps = reps + 1
      }
    }
    nextReps = Math.max(1, Math.round(nextReps))

    const whenToBump =
      reps >= bumpAtReps
        ? `At ${reps} reps → ${nextWeight} lb × ${repsAfterBump} reps`
        : `At ${bumpAtReps} reps → ${nextWeight} lb × ${repsAfterBump} reps`

    return {
      setIndex: i + 1,
      weight,
      reps,
      nextReps,
      nextWeightSuggested,
      nextLabel: `${nextWeightSuggested} lb × ${nextReps} reps`,
      nextWeight,
      repsAfterBump,
      whenToBump,
      whenToBumpShort: `At ${bumpAtReps} reps → ${nextWeight} lb × ${repsAfterBump}`,
    }
  })

  let session1RMNext = 0
  for (const s of setSuggestions) {
    const e = epley1RM(s.nextWeightSuggested, s.nextReps)
    if (e) session1RMNext = Math.max(session1RMNext, e)
  }

  const percentIncrease =
    session1RMCurrent > 0 ? ((session1RMNext - session1RMCurrent) / session1RMCurrent) * 100 : 0

  return {
    setSuggestions,
    session1RMCurrent: Math.round(session1RMCurrent * 10) / 10,
    session1RMNext: Math.round(session1RMNext * 10) / 10,
    percentIncrease: Math.round(percentIncrease * 10) / 10,
    date: lastWorkoutSets.date,
  }
}

export function getPlateMilestones() {
  return PLATE_MILESTONES
}

export function getPlateLabels() {
  return PLATE_LABELS
}

export function getTOP25() {
  return TOP_25
}

export { CUTOFF_DATE, OLYMPIC_BAR_LB, PLATES_LB }
