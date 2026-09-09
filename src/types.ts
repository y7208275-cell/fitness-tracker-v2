/** 训练部位 */
export type BodyPart = '胸' | '背' | '腿' | '肩' | '手臂';

/** 器械类型 */
export type Equipment = '杠铃' | '哑铃' | '器械' | '绳索' | '自重' | '其他';

/** 动作分类标签 */
export type ExerciseTag = '复合动作' | '单关节' | '后链' | '补充组' | '核心' | '自重';

/** 动作库条目 */
export interface LibraryExercise {
  id: number;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  tag: ExerciseTag;
  /** 目标肌群/训练重点，例如“腘绳肌与臀大肌” */
  focus: string;
  custom: boolean;
}

/** 一组记录 */
export interface WorkoutSet {
  id: number;
  weight: number;
  reps: number;
  done: boolean;
  warmup: boolean;
  drop: boolean;
}

/** 训练中的一个动作（含计划与实时数据） */
export interface WorkoutExercise {
  id: number;
  exerciseId: number;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  tag: ExerciseTag;
  focus: string;
  /** 建议休息秒数 */
  restSec: number;
  /** 计划组数/次数文案（用于展示计划） */
  planText: string;
  sets: WorkoutSet[];
}

/** 进行中的训练（localStorage 持久化，切换页面/后台不丢） */
export interface ActiveWorkout {
  bodyPart: BodyPart;
  title: string;
  exercises: WorkoutExercise[];
  startTimestamp: number;
}

/** 一次已保存的训练 */
export interface WorkoutSession {
  id?: number;
  date: string;
  bodyPart: BodyPart;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** 总容量 kg */
  volumeKg: number;
  /** 预估千卡 */
  kcal: number;
  exercises: WorkoutExercise[];
}

/** 排期类型 */
export type PlanKind = '经典五分化' | '推拉腿PPL' | '上肢/下肢分化' | '全身';

/** 一周排期条目 */
export interface ScheduleEntry {
  dayOfWeek: number; // 0=周日
  bodyPart: BodyPart | null;
}

/** 偏好设置 */
export interface AppSettings {
  id: number;
  planKind: PlanKind;
  schedule: ScheduleEntry[];
  defaultRestSec: number;
  autoStartRest: boolean;
  unit: 'kg' | 'lbs';
  haptics: boolean;
  autoWarmup: boolean;
}

/** 底部导航页 */
export type Page = 'home' | 'workout' | 'history' | 'settings';
