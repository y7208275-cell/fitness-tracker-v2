import type {
  ActiveWorkout,
  BodyPart,
  LibraryExercise,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from './types';
import { ROUTINE_TEMPLATES } from './db';

export const DAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];
export const DAY_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function uid(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtSeconds(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function dateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00').getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - target) / 86400000);
}

/** 训练动作总容量（kg） */
export function workoutVolume(exercises: WorkoutExercise[]): number {
  let v = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      if (s.weight > 0 && s.reps > 0) v += s.weight * s.reps;
    }
  }
  return v;
}

/** 已勾选完成组的总容量（kg） */
export function completedVolume(exercises: WorkoutExercise[]): number {
  let v = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      if (s.done && s.weight > 0 && s.reps > 0) v += s.weight * s.reps;
    }
  }
  return v;
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

export function estimateKcal(minutes: number): number {
  return Math.round(minutes * 7.8);
}

export function countSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

export function countDoneSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, e) => sum + e.sets.filter(s => s.done).length, 0);
}

export interface BestRecord {
  weight: number;
  reps: number;
  count: number;
}

/** 从历史会话中找出某个动作的最好记录（优先大重量，其次次数） */
export function findBestRecord(
  sessions: WorkoutSession[],
  exerciseId: number
): BestRecord | null {
  let best: BestRecord | null = null;
  for (const session of sessions) {
    for (const e of session.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of e.sets) {
        if (!s.done || s.weight <= 0 || s.reps <= 0) continue;
        if (
          !best ||
          s.weight > best.weight ||
          (s.weight === best.weight && s.reps > best.reps)
        ) {
          best = { weight: s.weight, reps: s.reps, count: 1 };
        }
      }
    }
  }
  return best;
}

/** 找出本会话中创造的新纪录（相对更早的历史） */
export function detectNewPRs(
  session: WorkoutSession,
  earlierSessions: WorkoutSession[]
): Array<{ exerciseName: string; weight: number; reps: number }> {
  const prs: Array<{ exerciseName: string; weight: number; reps: number }> = [];
  for (const e of session.exercises) {
    const best = findBestRecord(earlierSessions, e.exerciseId);
    const bestSet = e.sets
      .filter(s => s.done && s.weight > 0 && s.reps > 0)
      .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    if (bestSet && (!best || bestSet.weight > best.weight)) {
      prs.push({
        exerciseName: e.name,
        weight: bestSet.weight,
        reps: bestSet.reps,
      });
    }
  }
  return prs;
}

export function newSet(over: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id: uid(), weight: 0, reps: 0, done: false, warmup: false, drop: false, ...over };
}

/** 按照今日计划生成一组训练动作（进入训练页时使用） */
export function buildWorkoutFromPlan(
  bodyPart: BodyPart,
  library: LibraryExercise[],
  autoWarmup: boolean
): ActiveWorkout {
  const routine = ROUTINE_TEMPLATES[bodyPart];
  const exercises: WorkoutExercise[] = routine.items
    .map((item, idx) => {
      const ex = library.find(e => e.id === item.exerciseId);
      if (!ex) return null;
      const sets: WorkoutSet[] = Array.from({ length: item.sets }, (_, i) =>
        newSet({
          warmup: autoWarmup && i === 0,
          reps: 0,
        })
      );
      return {
        id: uid() + idx,
        exerciseId: ex.id,
        name: ex.name,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        tag: ex.tag,
        focus: ex.focus,
        restSec: item.restSec,
        planText: item.planText,
        sets,
      };
    })
    .filter((e): e is WorkoutExercise => e !== null);

  return {
    bodyPart,
    title: routine.title,
    exercises,
    startTimestamp: Date.now(),
  };
}

/** 手动添加一个动作（自定义/从弹窗选择） */
export function exerciseToWorkout(ex: LibraryExercise, restSec: number): WorkoutExercise {
  return {
    id: uid(),
    exerciseId: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
    equipment: ex.equipment,
    tag: ex.tag,
    focus: ex.focus,
    restSec,
    planText: '',
    sets: [newSet()],
  };
}

export function vibrate(ms = 20) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    // 不支持时忽略
  }
}

/** 内部统一按 kg 存储；单位切换时仅做展示换算 */
export function toDisplay(kg: number, unit: 'kg' | 'lbs'): number {
  const v = unit === 'lbs' ? kg / 0.45359237 : kg;
  return Math.round(v * 10) / 10;
}

export function fromDisplay(value: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') return value * 0.45359237;
  return value;
}
