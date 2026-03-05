import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  processWorkoutCSV,
  linearRegression,
  projectedPoints,
  projectDateToReach,
  suggestNext,
  suggestNextWorkout,
  getPlateMilestones,
  getPlateLabels,
  oneRMToRepWeight,
  getMilestoneDots,
  getPlateLoad,
  PLATE_LOADED_MACHINES,
  getPlateLoadNoBar,
  getDumbbellLoad,
  getWorkoutDates,
  getMuscleVolumeForDate,
  getMuscleVolumeForWeek,
  getMuscleVolumeForDateBySubcategory,
  getMuscleVolumeForWeekBySubcategory,
  getWeekBounds,
  getWeeksWithData,
  MUSCLE_GROUPS,
  MUSCLE_VOLUME_WEIGHTS,
  MUSCLE_GROUP_INFO,
  MUSCLE_SUBCATEGORIES,
  EXERCISE_TO_MUSCLES,
  DEFAULT_REP_RANGES,
  CUTOFF_DATE,
} from '../utils/workoutData'
import './Workouts.css'

const STORAGE_KEY = 'koboWorkoutsCSV'
const SUBTAB_STORAGE_KEY = 'koboWorkoutsSubTab'
const RM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

const PLATE_STYLES = {
  45: { size: 48, ring: 6, hole: 20, fill: '#ef4444', stroke: '#b91c1c' },
  25: { size: 42, ring: 5, hole: 18, fill: '#3b82f6', stroke: '#1d4ed8' },
  10: { size: 36, ring: 5, hole: 16, fill: '#10b981', stroke: '#059669' },
  5: { size: 30, ring: 4, hole: 14, fill: '#f59e0b', stroke: '#d97706' },
  2.5: { size: 26, ring: 4, hole: 12, fill: '#eab308', stroke: '#ca8a04' },
}

const BAR_STYLE = { size: 32, ring: 5, hole: 16, fill: '#64748b', stroke: '#475569', label: 'Bar' }

/** Dumbbell icon sizes and colors for common weights (lb). */
const DUMBBELL_STYLES = {
  50: { size: 36, fill: '#1e293b', stroke: '#0f172a' },
  45: { size: 34, fill: '#475569', stroke: '#334155' },
  40: { size: 32, fill: '#64748b', stroke: '#475569' },
  35: { size: 30, fill: '#3b82f6', stroke: '#2563eb' },
  30: { size: 28, fill: '#10b981', stroke: '#059669' },
  25: { size: 26, fill: '#f59e0b', stroke: '#d97706' },
  20: { size: 24, fill: '#8b5cf6', stroke: '#7c3aed' },
  15: { size: 22, fill: '#ec4899', stroke: '#db2777' },
  10: { size: 20, fill: '#06b6d4', stroke: '#0891b2' },
  5: { size: 18, fill: '#84cc16', stroke: '#65a30d' },
  2.5: { size: 16, fill: '#eab308', stroke: '#ca8a04' },
}

/** Inline SVG icons per muscle group (no icon library). */
const MUSCLE_GROUP_ICONS = {
  chest: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 12c0-2 2-4 8-4s8 2 8 4" />
      <path d="M4 12v4c0 2 2 4 8 4s8-2 8-4v-4" />
    </svg>
  ),
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 4v16" /><path d="M8 8h8v8H8z" /><path d="M6 6h4v4H6z" /><path d="M14 6h4v4h-4z" />
    </svg>
  ),
  shoulders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 10h4v4H4z" /><path d="M16 10h4v4h-4z" /><path d="M10 6h4v6h-4z" />
    </svg>
  ),
  biceps: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 4v16" /><path d="M8 8c4 0 8 4 8 4s-4 4-8 4" />
    </svg>
  ),
  triceps: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 4v16" /><path d="M16 8c-4 0-8 4-8 4s4 4 8 4" />
    </svg>
  ),
  quads: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="8" y="6" width="8" height="14" rx="2" />
    </svg>
  ),
  hamstrings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4l6 8v8" /><path d="M18 4l-6 8v8" />
    </svg>
  ),
  glutes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 12c0-4 4-8 8-8s8 4 8 8v8H4V12z" />
    </svg>
  ),
  calves: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 4v12l3-4 3 4V4" />
    </svg>
  ),
  core: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="6" ry="8" />
    </svg>
  ),
  forearms: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 10h12v4H6z" />
    </svg>
  ),
  neck: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="4" width="6" height="10" rx="1" />
    </svg>
  ),
}

function MuscleGroupIcon({ groupId, className }) {
  const info = MUSCLE_GROUP_INFO[groupId]
  if (!info) return null
  const icon = MUSCLE_GROUP_ICONS[info.icon]
  if (!icon) return null
  return <span className={className} title={info.label}>{icon}</span>
}

function PlateIcon({ lb, style }) {
  const s = style || PLATE_STYLES[lb]
  if (!s) return null
  const holePx = s.hole
  return (
    <span
      className="workouts-plate workouts-plate-donut"
      style={{
        width: s.size,
        height: s.size,
        minWidth: s.size,
        borderWidth: s.ring,
        borderColor: s.stroke,
        backgroundColor: s.fill,
        boxShadow: `inset 0 1px 2px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)`,
      }}
      title={`${lb} lb`}
    >
      <span
        className="workouts-plate-hole"
        style={{ width: holePx, height: holePx }}
      />
      <span className="workouts-plate-label">
        {lb}
      </span>
    </span>
  )
}

function BarIcon() {
  const s = BAR_STYLE
  return (
    <span
      className="workouts-plate workouts-plate-bar workouts-plate-donut"
      style={{
        width: s.size,
        height: s.size,
        minWidth: s.size,
        borderWidth: s.ring,
        borderColor: s.stroke,
        backgroundColor: 'transparent',
        boxShadow: 'none',
      }}
      title="Bar (45 lb)"
    >
      <span
        className="workouts-plate-hole"
        style={{ width: s.hole, height: s.hole }}
      />
      <span className="workouts-plate-label workouts-plate-label-bar">
        {s.label}
      </span>
    </span>
  )
}

function DumbbellIcon({ lb }) {
  const s = DUMBBELL_STYLES[lb] || { size: 24, fill: '#64748b', stroke: '#475569' }
  const w = s.size
  const h = Math.round(s.size * 0.6)
  return (
    <span className="workouts-dumbbell" title={`${lb} lb`} style={{ width: w, height: h, minWidth: w }}>
      <svg width={w} height={h} viewBox="0 0 24 14" fill="none" stroke={s.stroke} strokeWidth="1.5" strokeLinecap="round">
        <ellipse cx="4" cy="7" rx="3" ry="5" fill={s.fill} />
        <ellipse cx="20" cy="7" rx="3" ry="5" fill={s.fill} />
        <path d="M7 7h10" strokeWidth="2" />
      </svg>
      <span className="workouts-dumbbell-label">{lb}</span>
    </span>
  )
}

function PlateLoadIcons({ load }) {
  if (!load) return null
  if (load.dumbbell) {
    if (load.sizes.length === 0) return <span className="workouts-tooltip-plates">—</span>
    return (
      <span className="workouts-tooltip-plates">
        {load.sizes.map((lb, i) => (
          <DumbbellIcon key={`${lb}-${i}`} lb={lb} />
        ))}
        <span className="workouts-tooltip-plates-label">per hand</span>
      </span>
    )
  }
  if (load.perSide.length === 0 && !load.bar) return <span className="workouts-tooltip-plates">—</span>
  if (load.perSide.length === 0) {
    return (
      <span className="workouts-tooltip-plates">
        <BarIcon />
        <span className="workouts-tooltip-plates-label">empty bar</span>
      </span>
    )
  }
  return (
    <span className="workouts-tooltip-plates">
      {load.bar ? <BarIcon /> : null}
      {load.perSide.map((lb, i) => (
        <PlateIcon key={`${lb}-${i}`} lb={lb} />
      ))}
      <span className="workouts-tooltip-plates-label">per side</span>
    </span>
  )
}

function WorkoutChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const isBarbell = row?.isBarbell
  const weight = row?.oneRM ?? row?.projected1RM ?? (payload.find((p) => p.dataKey === 'oneRM' || p.dataKey === 'projected1RM')?.value)
  const load = isBarbell && weight != null && Number.isFinite(weight) ? getPlateLoad(Number(weight)) : null
  const milestoneLabel = row?.milestoneLabel
  return (
    <div className="workouts-tooltip">
      <div className="workouts-tooltip-label">{label}</div>
      {payload.map((p) => {
        if (p.dataKey === 'milestoneValue' && milestoneLabel) {
          return (
            <div key={p.dataKey} className="workouts-tooltip-row">
              <span className="workouts-tooltip-name">{milestoneLabel}</span>
              <span className="workouts-tooltip-value">{p.value != null ? `${Number(p.value).toFixed(1)} lb` : ''}</span>
            </div>
          )
        }
        if (p.dataKey === 'oneRM' || p.dataKey === 'projected1RM') {
          const name = p.dataKey === 'projected1RM' ? 'Projected' : 'Weight'
          return (
            <div key={p.dataKey} className="workouts-tooltip-row">
              <span className="workouts-tooltip-name">{name}</span>
              <span className="workouts-tooltip-value">{p.value != null ? `${Number(p.value).toFixed(1)} lb` : ''}</span>
            </div>
          )
        }
        return null
      })}
      {load && (
        <div className="workouts-tooltip-plate-load">
          <span className="workouts-tooltip-plate-load-title">Est. plate load</span>
          <PlateLoadIcons load={load} />
        </div>
      )}
    </div>
  )
}

function WeightWithPlateTooltip({ weightLb, isBarbell, exerciseName, children }) {
  const [show, setShow] = React.useState(false)
  const [rect, setRect] = React.useState(null)
  const wrapRef = React.useRef(null)
  const isDumbbell = exerciseName && exerciseName.toLowerCase().includes('dumbbell')
  const load =
    isBarbell && weightLb != null && Number.isFinite(weightLb)
      ? getPlateLoad(Number(weightLb))
      : isDumbbell && weightLb != null && Number.isFinite(weightLb)
        ? getDumbbellLoad(Number(weightLb))
        : exerciseName && PLATE_LOADED_MACHINES.has(exerciseName) && weightLb != null && Number.isFinite(weightLb)
          ? getPlateLoadNoBar(Number(weightLb))
          : null
  const hasWeight = weightLb != null && Number.isFinite(weightLb)
  const showNonBarbellTooltip = !isBarbell && !load && hasWeight

  const updateRect = React.useCallback(() => {
    if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect())
  }, [])

  const handleEnter = React.useCallback(() => {
    setShow(true)
    if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect())
  }, [])

  const handleLeave = React.useCallback(() => {
    setShow(false)
    setRect(null)
  }, [])

  React.useEffect(() => {
    if (!show || !wrapRef.current) return
    const el = wrapRef.current
    const observer = new ResizeObserver(updateRect)
    observer.observe(el)
    return () => observer.disconnect()
  }, [show, updateRect])

  if (!load && !showNonBarbellTooltip) return <>{children}</>
  return (
    <>
      <span
        ref={wrapRef}
        className="workouts-weight-wrap"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </span>
      {show && rect && typeof document !== 'undefined' && document.body &&
        (load
          ? ReactDOM.createPortal(
              <div
                className="workouts-next-plate-tooltip workouts-next-plate-tooltip-portal"
                style={{
                  left: rect.left + rect.width / 2,
                  top: rect.bottom + 6,
                  transform: 'translate(-50%, 0)',
                }}
              >
                <span className="workouts-tooltip-plate-load-title">
                  {load.dumbbell ? 'Dumbbell (per hand)' : load.bar ? 'Est. plate load' : 'Plate load'}
                </span>
                <PlateLoadIcons load={load} />
              </div>,
              document.body
            )
          : showNonBarbellTooltip &&
            ReactDOM.createPortal(
              <div
                className="workouts-next-plate-tooltip workouts-next-plate-tooltip-portal"
                style={{
                  left: rect.left + rect.width / 2,
                  top: rect.bottom + 6,
                  transform: 'translate(-50%, 0)',
                }}
              >
                <span className="workouts-tooltip-plate-load-title">Total weight (machine / load)</span>
              </div>,
              document.body
            )
      )}
    </>
  )
}

function Workouts() {
  const [csvText, setCsvText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReps, setSelectedReps] = useState(1)
  /** Target % increase per workout for next-workout suggestions (0.5–3). */
  const [targetPercentIncrease, setTargetPercentIncrease] = useState(1)
  /** How to order the exercise list: frequency (most sessions first), name, or priority (TOP 25 order). */
  const [sortBy, setSortBy] = useState('frequency')
  /** Sub-tab: 'next' = Next workout, 'stats' = charts + goal projection */
  const [workoutsSubTab, setWorkoutsSubTab] = useState(() => {
    try {
      const s = localStorage.getItem(SUBTAB_STORAGE_KEY)
      return (s === 'next' || s === 'stats' || s === 'muscles') ? s : 'next'
    } catch {
      return 'next'
    }
  })

  useEffect(() => {
    localStorage.setItem(SUBTAB_STORAGE_KEY, workoutsSubTab)
  }, [workoutsSubTab])

  /** Muscle balance: 'day' or 'week' */
  const [muscleViewMode, setMuscleViewMode] = useState('day')
  /** Selected date for muscle balance (day view = this date; week view = week containing this date). Empty = use latest. */
  const [muscleSelectedDate, setMuscleSelectedDate] = useState('')
  /** When set, bar chart shows subcategories for this group only; when null, shows all groups. Click a group bar to drill down. */
  const [muscleSelectedGroup, setMuscleSelectedGroup] = useState(null)

  const processed = useMemo(() => {
    if (!csvText) return null
    try {
      return processWorkoutCSV(csvText)
    } catch (e) {
      return null
    }
  }, [csvText])

  const exercisesByRank = processed?.exercisesByRank ?? []
  const lastWorkoutSetsByExercise = processed?.lastWorkoutSetsByExercise ?? {}
  const setsByExerciseByDate = processed?.setsByExerciseByDate ?? {}
  const barbellExercises = processed?.barbellExercises ?? new Set()

  const sortedExercises = useMemo(() => {
    if (!exercisesByRank.length) return []
    const list = [...exercisesByRank]
    if (sortBy === 'frequency') return list.sort((a, b) => (b.sessionCount ?? 0) - (a.sessionCount ?? 0))
    if (sortBy === 'name') return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (sortBy === 'priority') return list.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    if (sortBy === 'recency') {
      return list.sort((a, b) => {
        const dateA = lastWorkoutSetsByExercise[a.name]?.date ?? a.points?.[a.points.length - 1]?.date ?? ''
        const dateB = lastWorkoutSetsByExercise[b.name]?.date ?? b.points?.[b.points.length - 1]?.date ?? ''
        return (dateB || '').localeCompare(dateA || '')
      })
    }
    return list
  }, [exercisesByRank, sortBy, lastWorkoutSetsByExercise])

  const milestones = getPlateMilestones()
  const plateLabels = getPlateLabels()
  const repLabel = selectedReps === 1 ? '1RM' : `${selectedReps}RM`

  const isBarbellExercise = useMemo(() => {
    return (name) => barbellExercises.has(name) || (name && name.toLowerCase().includes('barbell'))
  }, [barbellExercises])

  const workoutDates = useMemo(() => getWorkoutDates(setsByExerciseByDate), [setsByExerciseByDate])
  const muscleEffectiveDate = muscleSelectedDate || (workoutDates.length ? workoutDates[workoutDates.length - 1] : '')
  const muscleWeekBounds = muscleEffectiveDate ? getWeekBounds(muscleEffectiveDate) : null
  const muscleVolumeByGroup = useMemo(() => {
    if (!muscleEffectiveDate || !Object.keys(setsByExerciseByDate).length) return []
    const vol =
      muscleViewMode === 'day'
        ? getMuscleVolumeForDate(setsByExerciseByDate, muscleEffectiveDate, EXERCISE_TO_MUSCLES)
        : muscleWeekBounds
          ? getMuscleVolumeForWeek(setsByExerciseByDate, muscleWeekBounds.weekStart, muscleWeekBounds.weekEnd, EXERCISE_TO_MUSCLES)
          : {}
    return MUSCLE_GROUPS.filter((m) => (vol[m] || 0) > 0).map((m) => ({ muscle: m, volume: Math.round(vol[m] || 0) }))
  }, [setsByExerciseByDate, muscleViewMode, muscleEffectiveDate, muscleWeekBounds])

  const muscleVolumeBySubcategory = useMemo(() => {
    if (!muscleEffectiveDate || !Object.keys(setsByExerciseByDate).length) return []
    const vol =
      muscleViewMode === 'day'
        ? getMuscleVolumeForDateBySubcategory(setsByExerciseByDate, muscleEffectiveDate)
        : muscleWeekBounds
          ? getMuscleVolumeForWeekBySubcategory(setsByExerciseByDate, muscleWeekBounds.weekStart, muscleWeekBounds.weekEnd)
          : {}
    return MUSCLE_SUBCATEGORIES.filter((s) => (vol[s.id] || 0) > 0).map((s) => ({
      subcategoryId: s.id,
      label: s.label,
      groupId: s.groupId,
      volume: Math.round(vol[s.id] || 0),
    }))
  }, [setsByExerciseByDate, muscleViewMode, muscleEffectiveDate, muscleWeekBounds])

  /** Bar chart: either all groups (parent) or subcategories for muscleSelectedGroup. */
  const muscleBalanceChartData = useMemo(() => {
    if (muscleSelectedGroup) {
      const sub = muscleVolumeBySubcategory.filter((s) => s.groupId === muscleSelectedGroup)
      return sub.map((s) => ({ ...s, displayLabel: s.label, isSubcategory: true }))
    }
    return muscleVolumeByGroup.map((g) => ({ ...g, displayLabel: g.muscle, groupId: g.muscle, isSubcategory: false }))
  }, [muscleSelectedGroup, muscleVolumeByGroup, muscleVolumeBySubcategory])

  const weeksWithData = useMemo(() => getWeeksWithData(setsByExerciseByDate), [setsByExerciseByDate])
  const muscleVolumeWeekOverWeek = useMemo(() => {
    if (!weeksWithData.length || !Object.keys(setsByExerciseByDate).length) return []
    return weeksWithData.map((weekStart) => {
      const d = new Date(weekStart + 'T12:00:00')
      d.setDate(d.getDate() + 6)
      const weekEnd = d.toISOString().slice(0, 10)
      const vol = getMuscleVolumeForWeek(setsByExerciseByDate, weekStart, weekEnd, EXERCISE_TO_MUSCLES)
      const weekLabel = new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
      let totalWeighted = 0
      for (const m of MUSCLE_GROUPS) {
        totalWeighted += (vol[m] || 0) * (MUSCLE_VOLUME_WEIGHTS[m] ?? 1)
      }
      const row = { weekLabel, weekStart }
      for (const m of MUSCLE_GROUPS) {
        const weighted = (vol[m] || 0) * (MUSCLE_VOLUME_WEIGHTS[m] ?? 1)
        row[m] = totalWeighted > 0 ? Math.round((weighted / totalWeighted) * 1000) / 10 : 0
      }
      return row
    })
  }, [setsByExerciseByDate, weeksWithData])

  const MUSCLE_LINE_COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7']

  useEffect(() => {
    const load = async () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCsvText(stored)
        setLoading(false)
        return
      }
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
      try {
        const res = await fetch(`${base}/strong_workouts.csv`)
        if (!res.ok) throw new Error('Failed to load default workout data')
        const text = await res.text()
        setCsvText(text)
      } catch (err) {
        setError(err.message || 'Could not load workout data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setCsvText(text)
        localStorage.setItem(STORAGE_KEY, text)
        setError(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = async () => {
    localStorage.removeItem(STORAGE_KEY)
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    try {
      const res = await fetch(`${base}/strong_workouts.csv`)
      if (!res.ok) throw new Error('Failed to load default')
      const text = await res.text()
      setCsvText(text)
      setError(null)
    } catch (err) {
      setError(err.message)
      setCsvText(null)
    }
  }

  if (loading) {
    return (
      <div className="workouts-container">
        <p className="workouts-loading">Loading workout data…</p>
      </div>
    )
  }

  if (!csvText) {
    return (
      <div className="workouts-container">
        <p className="workouts-note">Data is stored in this browser. Upload a CSV to use the Workouts tab.</p>
        {error && <p className="workouts-error">{error}</p>}
        <div className="workouts-upload">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="workouts-file"
            className="workouts-file-input"
          />
          <label htmlFor="workouts-file" className="workouts-file-label">
            Upload CSV
          </label>
          <button type="button" className="workouts-reset" onClick={handleReset}>
            Reset to default
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="workouts-container">
      <p className="workouts-note">Data is stored in this browser. Only data from {CUTOFF_DATE} onward is used.</p>
      {error && <p className="workouts-error">{error}</p>}
      <div className="workouts-upload">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          id="workouts-file"
          className="workouts-file-input"
        />
        <label htmlFor="workouts-file" className="workouts-file-label">
          Upload CSV
        </label>
        <button type="button" className="workouts-reset" onClick={handleReset}>
          Reset to default
        </button>
      </div>

      {processed && exercisesByRank.length > 0 && (
        <>
          <section className="workouts-section">
            <div className="workouts-sort">
              <span className="workouts-sort-label">Sort by:</span>
              {[
                { value: 'frequency', label: 'Frequency' },
                { value: 'recency', label: 'Recency' },
                { value: 'name', label: 'Name' },
                { value: 'priority', label: 'Ranking' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`workouts-sort-btn ${sortBy === value ? 'workouts-sort-btn-active' : ''}`}
                  onClick={() => setSortBy(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="workouts-subtabs">
              <button
                type="button"
                className={`workouts-subtab ${workoutsSubTab === 'next' ? 'workouts-subtab-active' : ''}`}
                onClick={() => setWorkoutsSubTab('next')}
              >
                Next workout
              </button>
              <button
                type="button"
                className={`workouts-subtab ${workoutsSubTab === 'stats' ? 'workouts-subtab-active' : ''}`}
                onClick={() => setWorkoutsSubTab('stats')}
              >
                Stats
              </button>
              <button
                type="button"
                className={`workouts-subtab ${workoutsSubTab === 'muscles' ? 'workouts-subtab-active' : ''}`}
                onClick={() => setWorkoutsSubTab('muscles')}
              >
                Muscle balance
              </button>
            </div>
          </section>

          {workoutsSubTab === 'next' && (
          <section className="workouts-section">
            <h2 className="workouts-section-title">Next workout</h2>
            <p className="workouts-section-desc">Uses all sets from your last session. Same number of sets next time. Add +1 rep each set; when you hit the top of your rep range, add weight and drop to the next range’s start.</p>
            <div className="workouts-rep-ranges">
              <span className="workouts-rep-ranges-label">Rep ranges (when to add weight):</span>
              <span className="workouts-rep-ranges-list">
                {DEFAULT_REP_RANGES.map((r) => (
                  <span key={r.bumpAt} className="workouts-rep-range-pill">
                    {r.low}–{r.high} → bump at {r.bumpAt}, then {r.repsAfterBump} reps
                  </span>
                ))}
              </span>
            </div>
            <div className="workouts-target-percent">
              <label className="workouts-target-label">
                Target % increase per workout:
                <span className="workouts-target-value">{targetPercentIncrease}%</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.25"
                value={targetPercentIncrease}
                onChange={(e) => setTargetPercentIncrease(Number(e.target.value))}
                className="workouts-target-slider"
              />
              <span className="workouts-target-hint">Predicted % if you add +1 rep each set. Bump thresholds come from rep ranges above.</span>
            </div>
            <div className="workouts-next-grid">
              {sortedExercises.map(({ name }) => {
                const lastWorkout = lastWorkoutSetsByExercise[name]
                const isBarbell = isBarbellExercise(name)
                const suggestion = lastWorkout ? suggestNextWorkout(lastWorkout, isBarbell, targetPercentIncrease) : null
                if (!lastWorkout || !suggestion) return null
                return (
                  <div key={name} className="workouts-next-card">
                    <div className="workouts-next-name">{name}</div>
                    <div className="workouts-next-meta">
                      Last: {lastWorkout.date} · {suggestion.setSuggestions.length} sets · Session e1RM: {suggestion.session1RMCurrent} lb
                    </div>
                    <div className="workouts-next-table-wrap">
                      <table className="workouts-next-table">
                        <thead>
                          <tr>
                            <th>Set</th>
                            <th>Last</th>
                            <th>Next</th>
                            <th>Bump at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suggestion.setSuggestions.map((set) => (
                            <tr key={set.setIndex}>
                              <td>{set.setIndex}</td>
                              <td>
                                <WeightWithPlateTooltip weightLb={set.weight} isBarbell={isBarbell} exerciseName={name}>
                                  {set.weight} lb
                                </WeightWithPlateTooltip>
                                {' × '}{set.reps}
                              </td>
                              <td className="workouts-set-next">
                                <WeightWithPlateTooltip weightLb={set.nextWeightSuggested} isBarbell={isBarbell} exerciseName={name}>
                                  {set.nextLabel}
                                </WeightWithPlateTooltip>
                              </td>
                              <td className="workouts-set-bump">{set.whenToBumpShort}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="workouts-next-stats">
                      Predicted session e1RM: <strong>{suggestion.session1RMNext} lb</strong>
                      {' · '}
                      <strong className="workouts-percent">+{suggestion.percentIncrease}%</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          )}

          {workoutsSubTab === 'muscles' && (
          <section className="workouts-section">
            <h2 className="workouts-section-title">
              <span className="workouts-muscle-title-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 5v14" /><path d="M18 5v14" /><path d="M6 12h12" />
                  <circle cx="6" cy="5" r="2.5" /><circle cx="6" cy="19" r="2.5" />
                  <circle cx="18" cy="5" r="2.5" /><circle cx="18" cy="19" r="2.5" />
                </svg>
              </span>
              Muscle balance
            </h2>
            <p className="workouts-section-desc">
              Volume (weight × reps) per muscle group and subcategory (e.g. rear delts, lats) for a single day, one week, or week over week. Week-over-week shares are weighted by muscle size/strength so balance is comparable. Only exercises mapped to muscle groups are included.
            </p>
            <div className="workouts-muscle-controls">
              <span className="workouts-muscle-label">View:</span>
              <button
                type="button"
                className={`workouts-sort-btn ${muscleViewMode === 'day' ? 'workouts-sort-btn-active' : ''}`}
                onClick={() => setMuscleViewMode('day')}
              >
                Day
              </button>
              <button
                type="button"
                className={`workouts-sort-btn ${muscleViewMode === 'week' ? 'workouts-sort-btn-active' : ''}`}
                onClick={() => setMuscleViewMode('week')}
              >
                Week
              </button>
              <button
                type="button"
                className={`workouts-sort-btn ${muscleViewMode === 'weekOverWeek' ? 'workouts-sort-btn-active' : ''}`}
                onClick={() => setMuscleViewMode('weekOverWeek')}
              >
                Week over week
              </button>
              {muscleViewMode !== 'weekOverWeek' && (
                <>
                  <span className="workouts-muscle-label">Date:</span>
                  <select
                    className="workouts-muscle-select"
                    value={muscleEffectiveDate}
                    onChange={(e) => setMuscleSelectedDate(e.target.value || '')}
                  >
                    {workoutDates.length === 0 ? (
                      <option value="">No workout dates</option>
                    ) : (
                      [...workoutDates].reverse().map((d) => (
                        <option key={d} value={d}>
                          {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </option>
                      ))
                    )}
                  </select>
                </>
              )}
            </div>
            {muscleViewMode === 'week' && muscleWeekBounds && (
              <p className="workouts-muscle-week-range">
                Week: {new Date(muscleWeekBounds.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(muscleWeekBounds.weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            {muscleSelectedGroup && (
              <p className="workouts-muscle-drill">
                <button type="button" className="workouts-muscle-back" onClick={() => setMuscleSelectedGroup(null)}>
                  ← Back to all groups
                </button>
                <span className="workouts-muscle-drill-label">Subcategories for {muscleSelectedGroup}</span>
              </p>
            )}
            <div className="workouts-muscle-chart-wrap">
              {muscleViewMode === 'weekOverWeek' ? (
                muscleVolumeWeekOverWeek.length === 0 ? (
                  <p className="workouts-muscle-empty">No week-over-week data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={muscleVolumeWeekOverWeek} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="weekLabel" stroke="#666" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Share of volume (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #ccc', borderRadius: 8 }}
                        formatter={(value) => [typeof value === 'number' ? `${Number(value).toFixed(1)}%` : value, 'Share']}
                      />
                      <Legend
                        formatter={(value) => (
                          <span className="workouts-muscle-legend-item">
                            <MuscleGroupIcon groupId={value} className="workouts-muscle-legend-icon" />
                            {value}
                          </span>
                        )}
                      />
                      {MUSCLE_GROUPS.map((m, i) => (
                        <Line
                          key={m}
                          type="monotone"
                          dataKey={m}
                          stroke={MUSCLE_LINE_COLORS[i % MUSCLE_LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={m}
                          connectNulls
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )
              ) : muscleBalanceChartData.length === 0 ? (
                <p className="workouts-muscle-empty">
                  {muscleSelectedGroup
                    ? `No subcategory volume for ${muscleSelectedGroup} in this ${muscleViewMode}.`
                    : `No volume data for this ${muscleViewMode}.`}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(280, muscleBalanceChartData.length * 32)}>
                  <BarChart
                    data={muscleBalanceChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Volume (lb)', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }} />
                    <YAxis
                      type="category"
                      dataKey="displayLabel"
                      stroke="#666"
                      tick={{ fontSize: 11 }}
                      width={115}
                      tickComponent={(props) => {
                        const { x, y, payload, index } = props
                        const row = muscleBalanceChartData.find((r) => r.displayLabel === payload) || muscleBalanceChartData[index]
                        if (!row) return null
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <foreignObject x={-108} y={-10} width={105} height={20}>
                              <span className="workouts-muscle-bar-label" xmlns="http://www.w3.org/1999/xhtml">
                                <MuscleGroupIcon groupId={row.groupId} className="workouts-muscle-bar-icon" />
                                {row.displayLabel}
                              </span>
                            </foreignObject>
                          </g>
                        )
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #ccc', borderRadius: 8 }}
                      formatter={(value) => [Number(value).toLocaleString() + ' lb', 'Volume']}
                      labelFormatter={(label) => label}
                    />
                    <Bar
                      dataKey="volume"
                      name="Volume"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={false}
                      cursor={!muscleSelectedGroup ? 'pointer' : 'default'}
                      onClick={(data) => {
                        if (!muscleSelectedGroup && data?.muscle) setMuscleSelectedGroup(data.muscle)
                      }}
                    >
                      {muscleBalanceChartData.map((entry, index) => (
                        <Cell key={entry.muscle || entry.subcategoryId || index} fill={entry.isSubcategory ? '#10b981' : '#667eea'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
          )}

          {workoutsSubTab === 'stats' && (
          <>
          <section className="workouts-section">
            <h2 className="workouts-section-title">{repLabel} over time</h2>
            <p className="workouts-section-desc">Estimated from Epley formula. Projection uses linear trend. Dots show when you’re projected to hit each plate milestone.</p>
            <div className="workouts-rm-selector">
              <span className="workouts-rm-label">Show as:</span>
              {RM_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`workouts-rm-btn ${selectedReps === r ? 'workouts-rm-btn-active' : ''}`}
                  onClick={() => setSelectedReps(r)}
                >
                  {r === 1 ? '1RM' : `${r}RM`}
                </button>
              ))}
            </div>
            <div className="workouts-charts">
              {sortedExercises.map(({ name, points }) => {
                if (!points.length) return null
                const isBarbell = isBarbellExercise(name)
                const reg = linearRegression(points)
                const proj = reg ? projectedPoints(points, reg, 90) : []
                const lastPoint = points[points.length - 1]
                const toRep = (v) => (v != null ? oneRMToRepWeight(v, selectedReps) : null)
                const actualData = points.map((p) => ({
                  dateLabel: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
                  date: p.date,
                  oneRM: toRep(p.oneRM),
                  projected1RM: null,
                  milestoneValue: null,
                }))
                const projectedData = proj.map((p, i) => {
                  const oneRM = (i === 0 && p.date === lastPoint.date) ? lastPoint.oneRM : p.oneRM
                  return {
                    dateLabel: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
                    date: p.date,
                    oneRM: null,
                    projected1RM: toRep(oneRM),
                    milestoneValue: null,
                  }
                })
                const byDate = {}
                actualData.forEach((r) => { byDate[r.date] = { ...r } })
                projectedData.forEach((r) => {
                  if (byDate[r.date]) byDate[r.date].projected1RM = r.projected1RM
                  else byDate[r.date] = { ...r }
                })
                let chartData = Object.values(byDate)
                chartData.forEach((r) => { r.isBarbell = isBarbell })
                const target1RMs = selectedReps === 1
                  ? milestones
                  : milestones.map((lb) => Math.round(lb * (1 + selectedReps / 30) * 10) / 10)
                const milestoneDots = isBarbell ? getMilestoneDots(reg, target1RMs, lastPoint.date, 90, points) : []
                for (const { date, goal1RM } of milestoneDots) {
                  const dateLabel = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                  const valueLb = selectedReps === 1 ? goal1RM : Math.round((goal1RM / (1 + selectedReps / 30)) * 10) / 10
                  const value = oneRMToRepWeight(goal1RM, selectedReps)
                  const baseLabel = plateLabels[Math.round(valueLb)] ?? plateLabels[goal1RM] ?? `${valueLb} lb`
                  const label = selectedReps === 1 ? baseLabel : baseLabel.replace(/ \(\d+ lb\)$/, '') + ` (${valueLb} lb at ${selectedReps} reps)`
                  const existing = chartData.find((r) => r.date === date)
                  if (existing) {
                    existing.milestoneValue = value
                    existing.milestoneLabel = label
                  } else {
                    chartData.push({ dateLabel, date, oneRM: null, projected1RM: null, milestoneValue: value, milestoneLabel: label, isBarbell })
                  }
                }
                chartData = chartData.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                const weeklyRateLb = reg && reg.slope > 0 ? reg.slope * 7 : null
                const latest1RM = lastPoint?.oneRM
                const weeklyRatePct = weeklyRateLb != null && latest1RM > 0 ? (weeklyRateLb / latest1RM) * 100 : null
                const currentRepWeight = latest1RM != null ? toRep(latest1RM) : null
                return (
                  <div key={`${name}-${selectedReps}`} className="workouts-chart-block">
                    <h3 className="workouts-chart-title">{name}</h3>
                    {(currentRepWeight != null || weeklyRateLb != null) && (
                      <p className="workouts-chart-meta">
                        {currentRepWeight != null && (
                          <span className="workouts-chart-current-rm">
                            Current {repLabel}: <strong>{Math.round(currentRepWeight * 10) / 10} lb</strong>
                          </span>
                        )}
                        {weeklyRateLb != null && (
                          <>
                            {currentRepWeight != null && ' · '}
                            <span>
                              +{weeklyRateLb.toFixed(1)} lb/week
                              {weeklyRatePct != null && ` (${weeklyRatePct.toFixed(1)}% per week)`}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="dateLabel" stroke="#666" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: `${repLabel} (lb)`, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #ccc', borderRadius: 8 }}
                          content={<WorkoutChartTooltip />}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="oneRM"
                          stroke="#667eea"
                          strokeWidth={2}
                          dot={{ fill: '#667eea', r: 3 }}
                          name={repLabel}
                          connectNulls
                          isAnimationActive={false}
                        />
                        {reg && (
                          <Line
                            type="monotone"
                            dataKey="projected1RM"
                            stroke="#a78bfa"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name={`Projected ${repLabel}`}
                            connectNulls
                            isAnimationActive={false}
                          />
                        )}
                        {milestoneDots.length > 0 && (
                          <Line
                            type="monotone"
                            dataKey="milestoneValue"
                            stroke="none"
                            dot={{ fill: '#eab308', stroke: '#ca8a04', strokeWidth: 1, r: 6 }}
                            name="Milestone"
                            connectNulls={false}
                            isAnimationActive={false}
                            label={{ position: 'top', dataKey: 'milestoneLabel', fill: '#92400e', fontSize: 10 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="workouts-section">
            <h2 className="workouts-section-title">Goal projection (barbell)</h2>
            <p className="workouts-section-desc">
              When will you hit each plate milestone? Assumes Olympic bar (45 lb). 1 plate = 135 lb total, 2 plates = 225 lb, etc.
              {selectedReps !== 1 && ` Shown as weight at ${selectedReps} reps (e.g. 135 lb at ${selectedReps} reps).`}
            </p>
            <div className="workouts-goals">
              {sortedExercises
                .filter(({ name }) => isBarbellExercise(name))
                .map(({ name, points }) => {
                  if (!points.length) return null
                  const reg = linearRegression(points)
                  const current1RM = Math.max(...points.map((p) => p.oneRM))
                  return (
                    <div key={name} className="workouts-goal-block">
                      <h3 className="workouts-goal-name">{name}</h3>
                      <ul className="workouts-goal-list">
                        {milestones.map((goalLb) => {
                          const target1RM = selectedReps === 1 ? goalLb : Math.round(goalLb * (1 + selectedReps / 30) * 10) / 10
                          if (current1RM >= target1RM) {
                            const repPart = selectedReps === 1 ? '' : ` (${goalLb} lb at ${selectedReps} reps)`
                            return (
                              <li key={goalLb} className="workouts-goal-achieved">
                                {plateLabels[goalLb] || `${goalLb} lb`}{repPart}: Achieved
                              </li>
                            )
                          }
                          const dateStr = reg ? projectDateToReach(reg, target1RM) : null
                          const repPart = selectedReps === 1 ? '' : ` (${goalLb} lb at ${selectedReps} reps)`
                          const label = dateStr
                            ? `${plateLabels[goalLb] || goalLb + ' lb'}${repPart} (~${new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
                            : `${plateLabels[goalLb] || goalLb + ' lb'}${repPart}: —`
                          return (
                            <li key={goalLb} className="workouts-goal-pending">
                              {label}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
            </div>
          </section>
          </>
          )}
        </>
      )}

      {processed && exercisesByRank.length === 0 && (
        <p className="workouts-empty">No workout data after {CUTOFF_DATE}. Upload a CSV with dates from November 2025 onward.</p>
      )}
    </div>
  )
}

export default Workouts
