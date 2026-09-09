import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  BodyPart,
  LibraryExercise,
  PlanKind,
  ScheduleEntry,
  WorkoutSession,
} from './types';

class FitnessDBV2 extends Dexie {
  exercises!: Table<LibraryExercise, number>;
  workoutSessions!: Table<WorkoutSession, number>;
  appSettings!: Table<AppSettings, number>;

  constructor() {
    super('FitnessTrackerV2DB');
    this.version(1).stores({
      exercises: '++id, bodyPart, name',
      workoutSessions: '++id, date, bodyPart',
      appSettings: 'id',
    });
  }
}

export const db = new FitnessDBV2();

export const ALL_PARTS: BodyPart[] = ['胸', '背', '腿', '肩', '手臂'];
export const PART_NAMES: Record<BodyPart, string> = {
  胸: '胸部',
  背: '背部',
  腿: '腿部',
  肩: '肩部',
  手臂: '手臂',
};
export const PART_EN: Record<BodyPart, string> = {
  胸: 'Chest',
  背: 'Back',
  腿: 'Legs',
  肩: 'Shoulders',
  手臂: 'Arms',
};
export const PART_FOCUS: Record<BodyPart, string> = {
  胸: '胸大肌与三头协同',
  背: '背阔肌与斜方',
  腿: '高消耗大肌群',
  肩: '三角肌前中后束',
  手臂: '肱二头肱三头',
};

export const PRESET_EXERCISES: Omit<LibraryExercise, 'custom'>[] = [
  // 腿
  { id: 1, name: '杠铃深蹲', bodyPart: '腿', equipment: '杠铃', tag: '复合动作', focus: '股四头肌/臀大肌' },
  { id: 2, name: '罗马尼亚硬拉', bodyPart: '腿', equipment: '杠铃', tag: '后链', focus: '腘绳肌与臀大肌' },
  { id: 3, name: '器械腿屈伸', bodyPart: '腿', equipment: '器械', tag: '单关节', focus: '股四头肌' },
  { id: 4, name: '俯卧腿弯举', bodyPart: '腿', equipment: '器械', tag: '单关节', focus: '腘绳肌/顶峰收缩' },
  { id: 5, name: '站姿器械提踵', bodyPart: '腿', equipment: '器械', tag: '补充组', focus: '小腿腓肠肌' },
  { id: 6, name: '腿举', bodyPart: '腿', equipment: '器械', tag: '复合动作', focus: '股四头肌/臀大肌' },
  { id: 7, name: '哑铃箭步蹲', bodyPart: '腿', equipment: '哑铃', tag: '复合动作', focus: '股四头肌/臀' },
  { id: 8, name: '保加利亚分腿蹲', bodyPart: '腿', equipment: '哑铃', tag: '复合动作', focus: '单腿稳定' },
  { id: 9, name: '臀推', bodyPart: '腿', equipment: '杠铃', tag: '复合动作', focus: '臀大肌' },
  // 胸
  { id: 10, name: '平板杠铃卧推', bodyPart: '胸', equipment: '杠铃', tag: '复合动作', focus: '胸大肌' },
  { id: 11, name: '上斜哑铃卧推', bodyPart: '胸', equipment: '哑铃', tag: '复合动作', focus: '上胸' },
  { id: 12, name: '上斜哑铃飞鸟', bodyPart: '胸', equipment: '哑铃', tag: '单关节', focus: '上胸/胸缝' },
  { id: 13, name: '哑铃飞鸟', bodyPart: '胸', equipment: '哑铃', tag: '单关节', focus: '胸中缝' },
  { id: 14, name: '龙门夹胸', bodyPart: '胸', equipment: '绳索', tag: '单关节', focus: '胸中缝' },
  { id: 15, name: '双杠臂屈伸', bodyPart: '胸', equipment: '自重', tag: '自重', focus: '下胸/三头' },
  { id: 16, name: '器械推胸', bodyPart: '胸', equipment: '器械', tag: '复合动作', focus: '胸大肌' },
  { id: 17, name: '下斜杠铃卧推', bodyPart: '胸', equipment: '杠铃', tag: '复合动作', focus: '下胸' },
  // 背
  { id: 18, name: '正手引体向上', bodyPart: '背', equipment: '自重', tag: '自重', focus: '背阔肌' },
  { id: 19, name: '高位下拉', bodyPart: '背', equipment: '器械', tag: '复合动作', focus: '背阔肌' },
  { id: 20, name: '杠铃划船', bodyPart: '背', equipment: '杠铃', tag: '复合动作', focus: '背阔肌/斜方' },
  { id: 21, name: '坐姿划船', bodyPart: '背', equipment: '器械', tag: '复合动作', focus: '中背' },
  { id: 22, name: '单臂哑铃划船', bodyPart: '背', equipment: '哑铃', tag: '复合动作', focus: '背阔肌' },
  { id: 23, name: 'T杠划船', bodyPart: '背', equipment: '杠铃', tag: '复合动作', focus: '中背' },
  { id: 24, name: '硬拉', bodyPart: '背', equipment: '杠铃', tag: '复合动作', focus: '后链/竖脊肌' },
  // 肩
  { id: 25, name: '哑铃推举', bodyPart: '肩', equipment: '哑铃', tag: '复合动作', focus: '三角肌前中束' },
  { id: 26, name: '侧平举', bodyPart: '肩', equipment: '哑铃', tag: '单关节', focus: '三角肌中束' },
  { id: 27, name: '前平举', bodyPart: '肩', equipment: '哑铃', tag: '单关节', focus: '三角肌前束' },
  { id: 28, name: '面拉', bodyPart: '肩', equipment: '绳索', tag: '单关节', focus: '后束/肩袖' },
  { id: 29, name: '阿诺德推举', bodyPart: '肩', equipment: '哑铃', tag: '复合动作', focus: '三角肌' },
  { id: 30, name: '反向飞鸟', bodyPart: '肩', equipment: '器械', tag: '单关节', focus: '三角肌后束' },
  { id: 31, name: '杠铃推举', bodyPart: '肩', equipment: '杠铃', tag: '复合动作', focus: '三角肌前束' },
  // 手臂
  { id: 32, name: '杠铃弯举', bodyPart: '手臂', equipment: '杠铃', tag: '单关节', focus: '肱二头' },
  { id: 33, name: '哑铃弯举', bodyPart: '手臂', equipment: '哑铃', tag: '单关节', focus: '肱二头' },
  { id: 34, name: '锤式弯举', bodyPart: '手臂', equipment: '哑铃', tag: '单关节', focus: '肱肌' },
  { id: 35, name: '绳索下压', bodyPart: '手臂', equipment: '绳索', tag: '单关节', focus: '肱三头' },
  { id: 36, name: '窄距卧推', bodyPart: '手臂', equipment: '杠铃', tag: '复合动作', focus: '肱三头' },
  { id: 37, name: '牧师凳弯举', bodyPart: '手臂', equipment: '杠铃', tag: '单关节', focus: '肱二头' },
  { id: 38, name: '仰卧臂屈伸', bodyPart: '手臂', equipment: '哑铃', tag: '单关节', focus: '肱三头' },
];

export const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  { dayOfWeek: 1, bodyPart: '胸' },
  { dayOfWeek: 2, bodyPart: '背' },
  { dayOfWeek: 3, bodyPart: '腿' },
  { dayOfWeek: 4, bodyPart: '肩' },
  { dayOfWeek: 5, bodyPart: '手臂' },
  { dayOfWeek: 6, bodyPart: null },
  { dayOfWeek: 0, bodyPart: null },
];

export const PLAN_TEMPLATES: Record<Exclude<PlanKind, '经典五分化'>, ScheduleEntry[]> = {
  '推拉腿PPL': [
    { dayOfWeek: 1, bodyPart: '胸' },
    { dayOfWeek: 2, bodyPart: '背' },
    { dayOfWeek: 3, bodyPart: '腿' },
    { dayOfWeek: 4, bodyPart: '胸' },
    { dayOfWeek: 5, bodyPart: '背' },
    { dayOfWeek: 6, bodyPart: '腿' },
    { dayOfWeek: 0, bodyPart: null },
  ],
  '上肢/下肢分化': [
    { dayOfWeek: 1, bodyPart: '胸' },
    { dayOfWeek: 2, bodyPart: '腿' },
    { dayOfWeek: 3, bodyPart: '背' },
    { dayOfWeek: 4, bodyPart: '腿' },
    { dayOfWeek: 5, bodyPart: '手臂' },
    { dayOfWeek: 6, bodyPart: null },
    { dayOfWeek: 0, bodyPart: null },
  ],
  '全身': [
    { dayOfWeek: 1, bodyPart: '胸' },
    { dayOfWeek: 2, bodyPart: null },
    { dayOfWeek: 3, bodyPart: '腿' },
    { dayOfWeek: 4, bodyPart: null },
    { dayOfWeek: 5, bodyPart: '背' },
    { dayOfWeek: 6, bodyPart: null },
    { dayOfWeek: 0, bodyPart: null },
  ],
};

interface RoutinePlanItem {
  exerciseId: number;
  sets: number;
  restSec: number;
  planText: string;
}

export interface RoutinePlan {
  title: string;
  warmupText: string;
  estimateMinutes: number;
  items: RoutinePlanItem[];
}

export const ROUTINE_TEMPLATES: Record<BodyPart, RoutinePlan> = {
  胸: {
    title: '力量推胸与三头协同激活',
    warmupText: '弹力带肩部环绕 2 分钟 + 空杆卧推热身 2 组',
    estimateMinutes: 45,
    items: [
      { exerciseId: 10, sets: 4, restSec: 90, planText: '4组 × 8次' },
      { exerciseId: 12, sets: 3, restSec: 60, planText: '3组 × 12次' },
      { exerciseId: 15, sets: 3, restSec: 60, planText: '3组 × 10次' },
      { exerciseId: 14, sets: 3, restSec: 60, planText: '3组 × 12次' },
    ],
  },
  背: {
    title: '背阔肌宽度与厚度训练',
    warmupText: '弹力带扩胸活动肩胛 + 自重引体慢放 2 组',
    estimateMinutes: 45,
    items: [
      { exerciseId: 18, sets: 4, restSec: 90, planText: '4组 × 8次' },
      { exerciseId: 19, sets: 4, restSec: 60, planText: '4组 × 12次' },
      { exerciseId: 20, sets: 4, restSec: 90, planText: '4组 × 10次' },
      { exerciseId: 21, sets: 3, restSec: 60, planText: '3组 × 12次' },
    ],
  },
  腿: {
    title: '腿部高阶力量',
    warmupText: '泡沫轴放松臀腿 3 分钟 + 动态髋关节环绕',
    estimateMinutes: 55,
    items: [
      { exerciseId: 1, sets: 4, restSec: 90, planText: '4组 × 8次' },
      { exerciseId: 2, sets: 4, restSec: 90, planText: '4组 × 10-12次' },
      { exerciseId: 3, sets: 4, restSec: 60, planText: '4组 × 12-15次' },
      { exerciseId: 4, sets: 5, restSec: 60, planText: '5组 × 12次' },
      { exerciseId: 5, sets: 3, restSec: 45, planText: '3组 × 15-20次' },
    ],
  },
  肩: {
    title: '三角肌全面轰炸',
    warmupText: '肩袖弹力带激活 + 轻重量的侧平举热身',
    estimateMinutes: 45,
    items: [
      { exerciseId: 25, sets: 4, restSec: 90, planText: '4组 × 10次' },
      { exerciseId: 26, sets: 4, restSec: 60, planText: '4组 × 15次' },
      { exerciseId: 27, sets: 3, restSec: 60, planText: '3组 × 12次' },
      { exerciseId: 28, sets: 3, restSec: 60, planText: '3组 × 15次' },
      { exerciseId: 30, sets: 3, restSec: 60, planText: '3组 × 15次' },
    ],
  },
  手臂: {
    title: '肱二头肱三头泵感日',
    warmupText: '轻重量弯举与下压各 1 组预热关节',
    estimateMinutes: 40,
    items: [
      { exerciseId: 32, sets: 4, restSec: 60, planText: '4组 × 10次' },
      { exerciseId: 34, sets: 3, restSec: 60, planText: '3组 × 12次' },
      { exerciseId: 35, sets: 4, restSec: 60, planText: '4组 × 12次' },
      { exerciseId: 38, sets: 3, restSec: 60, planText: '3组 × 10次' },
    ],
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  planKind: '经典五分化',
  schedule: DEFAULT_SCHEDULE,
  defaultRestSec: 90,
  autoStartRest: true,
  unit: 'kg',
  haptics: true,
  autoWarmup: true,
};

export async function initDB(): Promise<void> {
  const exCount = await db.exercises.count();
  if (exCount === 0) {
    await db.exercises.bulkAdd(
      PRESET_EXERCISES.map(e => ({ ...e, custom: false }))
    );
  }
  const settings = await db.appSettings.get(1);
  if (!settings) {
    await db.appSettings.put(DEFAULT_SETTINGS);
  }
}

export async function getSettings(): Promise<AppSettings> {
  const s = await db.appSettings.get(1);
  return s ?? DEFAULT_SETTINGS;
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await db.appSettings.put({ ...s, id: 1 });
}

export async function getExercisesByPart(bodyPart: BodyPart): Promise<LibraryExercise[]> {
  return db.exercises.where('bodyPart').equals(bodyPart).toArray();
}

export async function getAllExercises(): Promise<LibraryExercise[]> {
  return db.exercises.orderBy('id').toArray();
}

export async function getTodayPlan(
  exercises: LibraryExercise[],
  bodyPart: BodyPart | null
): Promise<{ routine: RoutinePlan; available: LibraryExercise[] } | null> {
  if (!bodyPart) return null;
  const lib = exercises.length > 0 ? exercises : await getExercisesByPart(bodyPart);
  const routine = ROUTINE_TEMPLATES[bodyPart];
  return { routine, available: lib };
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
  return db.workoutSessions.orderBy('date').reverse().toArray();
}

export async function saveSession(session: WorkoutSession): Promise<number> {
  return db.workoutSessions.put(session);
}
