import { useState } from 'react';
import {
  DEFAULT_SCHEDULE,
  PART_FOCUS,
  PLAN_TEMPLATES,
  PRESET_EXERCISES,
  db,
} from '../db';
import {
  DAY_CHARS,
  DAY_FULL,
  dateISO,
  findBestRecord,
} from '../utils';
import {
  DownloadIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from '../icons';
import type {
  AppSettings,
  BodyPart,
  Equipment,
  LibraryExercise,
  PlanKind,
  WorkoutSession,
} from '../types';

interface Props {
  settings: AppSettings;
  library: LibraryExercise[];
  sessions: WorkoutSession[];
  onSettingsChange: (s: AppSettings) => void;
  onLibraryChange: (list: LibraryExercise[]) => void;
}

const PLAN_KINDS: PlanKind[] = ['经典五分化', '推拉腿PPL', '上肢/下肢分化', '全身'];
const REST_SUGGEST: Record<number, string> = {
  6: '周六 · 休息恢复',
  0: '周日 · 拉伸/散步',
};
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const ALL_PARTS: BodyPart[] = ['胸', '背', '腿', '肩', '手臂'];
const EQUIPMENTS: Equipment[] = ['杠铃', '哑铃', '器械', '绳索', '自重', '其他'];

function guessTag(name: string): LibraryExercise['tag'] {
  const joint = ['弯举', '飞鸟', '提踵', '平举', '夹胸', '下压', '腿屈伸', '腿弯举'];
  if (joint.some(k => name.includes(k))) return '单关节';
  if (name.includes('罗马尼亚硬拉') || name.includes('硬拉') || name.includes('深蹲')) return '复合动作';
  return '复合动作';
}

export function SettingsPage({
  settings,
  library,
  sessions,
  onSettingsChange,
  onLibraryChange,
}: Props) {
  const [activePart, setActivePart] = useState<BodyPart>('腿');
  const [newName, setNewName] = useState('');
  const [newEquip, setNewEquip] = useState<Equipment>('杠铃');
  const today = new Date();
  const todayDow = today.getDay();

  function commit(next: AppSettings) {
    onSettingsChange(next);
  }

  function applyPlanKind(kind: PlanKind) {
    const template =
      kind === '经典五分化'
        ? DEFAULT_SCHEDULE
        : PLAN_TEMPLATES[kind as Exclude<PlanKind, '经典五分化'>];
    commit({ ...settings, planKind: kind, schedule: template.map(t => ({ ...t })) });
  }

  function setDayPart(dayOfWeek: number, bodyPart: BodyPart | null) {
    commit({
      ...settings,
      schedule: settings.schedule.map(s =>
        s.dayOfWeek === dayOfWeek ? { ...s, bodyPart } : s
      ),
    });
  }

  async function addExercise() {
    const name = newName.trim();
    if (!name) return;
    const ex: LibraryExercise = {
      id: Date.now(),
      name,
      bodyPart: activePart,
      equipment: newEquip,
      tag: guessTag(name),
      focus: '自定义动作',
      custom: true,
    };
    await db.exercises.put(ex);
    onLibraryChange([...library, ex]);
    setNewName('');
  }

  async function removeExercise(id: number) {
    const ex = library.find(e => e.id === id);
    if (ex?.custom && !confirm(`确定从动作库删除“${ex.name}”？`)) return;
    if (!ex?.custom) return;
    await db.exercises.delete(id);
    onLibraryChange(library.filter(e => e.id !== id));
  }

  async function resetLibrary() {
    if (!confirm('恢复初始动作库会移除所有自定义动作，确定继续？')) return;
    await db.exercises.clear();
    await db.exercises.bulkAdd(PRESET_EXERCISES.map(e => ({ ...e, custom: false })));
    onLibraryChange(await db.exercises.orderBy('id').toArray());
  }

  function exportCSV() {
    const rows = [
      ['日期', '部位', '标题', '动作', '组号', '重量(kg)', '次数', '热身', '递减', '时长(分)'],
    ];
    for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
      for (const e of s.exercises) {
        e.sets.forEach((set, i) => {
          if (!set.done && set.weight <= 0 && set.reps <= 0) return;
          rows.push([
            s.date,
            s.bodyPart,
            s.title,
            e.name,
            String(i + 1),
            String(set.weight || ''),
            String(set.reps || ''),
            set.warmup ? '是' : '',
            set.drop ? '是' : '',
            String(s.durationMinutes || ''),
          ]);
        });
      }
    }
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `训练日志_${dateISO(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const partExercises = library.filter(e => e.bodyPart === activePart);

  return (
    <div className="page settings-page">
      <div className="page-head-en">Settings</div>
      <h1 className="page-title-cn">设置</h1>

      <section className="card settings-card">
        <div className="card-head">
          <span>🗓 训练排期</span>
          <span className="badge-active">周循环已激活</span>
        </div>
        <p className="muted">每周自动循环规划，可随时调整每天练的部位</p>

        <div className="plan-kind-row">
          {PLAN_KINDS.map(kind => (
            <button
              key={kind}
              className={`chip ${settings.planKind === kind ? 'active' : ''}`}
              onClick={() => applyPlanKind(kind)}
            >
              {kind}
            </button>
          ))}
        </div>

        <div className="schedule-list">
          {WEEK_ORDER.map(dow => {
            const entry = settings.schedule.find(s => s.dayOfWeek === dow);
            const part = entry?.bodyPart ?? null;
            const isToday = dow === todayDow;
            return (
              <div key={dow} className="schedule-row">
                <div className="schedule-day">
                  <span className={`day-char ${isToday ? 'today' : ''}`}>
                    {DAY_CHARS[dow]}
                  </span>
                  <div>
                    <div className="schedule-day-name">
                      {DAY_FULL[dow]}
                      {isToday && <span className="badge-today">今日</span>}
                    </div>
                    <div className="schedule-day-focus">
                      {part
                        ? `${PART_FOCUS[part]}${dow === 3 ? ' · 高消耗大肌群' : ''}`
                        : REST_SUGGEST[dow] ?? '休息日'}
                    </div>
                  </div>
                </div>
                <select
                  className="schedule-select"
                  value={part ?? '_rest'}
                  onChange={ev => {
                    const v = ev.target.value;
                    setDayPart(dow, v === '_rest' ? null : (v as BodyPart));
                  }}
                >
                  <option value="_rest">休息</option>
                  {ALL_PARTS.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-head">
          <span>🏋️ 动作库管理</span>
          <span className="muted">批量排序</span>
        </div>
        <p className="muted">已收录 {library.length} 个动作，可按部位添加新动作</p>

        <div className="filter-row">
          {ALL_PARTS.map(p => (
            <button
              key={p}
              className={`chip ${activePart === p ? 'active' : ''}`}
              onClick={() => setActivePart(p)}
            >
              {p === '腿' ? '腿部' : p === '手臂' ? '手臂' : p + '部'}
            </button>
          ))}
        </div>

        <div className="add-ex-form">
          <input
            placeholder="输入新动作名称，例如：高脚杯深蹲"
            value={newName}
            onChange={ev => setNewName(ev.target.value)}
            onKeyDown={ev => {
              if (ev.key === 'Enter') addExercise();
            }}
          />
          <select value={newEquip} onChange={ev => setNewEquip(ev.target.value as Equipment)}>
            {EQUIPMENTS.map(eq => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>
        <button className="add-library-btn" onClick={addExercise}>
          <PlusIcon size={16} />
          添加至当前部位动作库
        </button>

        <div className="library-list">
          <div className="library-group">
            <div className="library-group-title">
              {activePart}部 · {partExercises.length} 个动作
            </div>
            {partExercises.map(ex => {
              const best = findBestRecord(sessions, ex.id);
              return (
                <div key={ex.id} className="library-row">
                  <div className="library-info">
                    <div className="library-name">
                      {ex.name}
                      {ex.custom && <span className="tag-mini custom">自定义</span>}
                    </div>
                    <div className="library-meta">
                      {ex.equipment} · {ex.tag}
                      {best
                        ? ` · 历史纪录：${best.weight}kg × ${best.reps}`
                        : ` · ${ex.focus}`}
                    </div>
                  </div>
                  {ex.custom ? (
                    <button className="icon-btn faint" onClick={() => removeExercise(ex.id)}>
                      <TrashIcon size={15} />
                    </button>
                  ) : (
                    <span className="tag-mini soft">{ex.equipment}</span>
                  )}
                </div>
              );
            })}
            {partExercises.length === 0 && <div className="muted">该部位还没有动作</div>}
          </div>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-head">
          <span>🎛 训练偏好设置</span>
        </div>
        <p className="muted">节拍、单位与自动化</p>

        <div className="pref-block">
          <div className="pref-label">组间默认倒计时</div>
          <div className="seg-row">
            {[60, 90, 120].map(sec => (
              <button
                key={sec}
                className={`seg ${settings.defaultRestSec === sec ? 'active' : ''}`}
                onClick={() => commit({ ...settings, defaultRestSec: sec })}
              >
                {sec}秒
              </button>
            ))}
          </div>
        </div>

        <div className="pref-row" onClick={() => commit({ ...settings, autoStartRest: !settings.autoStartRest })}>
          <div>
            <div className="pref-label">打勾完成该组后自动启动</div>
            <div className="muted">组间倒计时自动开始</div>
          </div>
          <Switch checked={settings.autoStartRest} />
        </div>

        <div className="pref-row">
          <div>
            <div className="pref-label">重量度量单位</div>
            <div className="muted">全局负荷与容量统计计算</div>
          </div>
          <div className="unit-seg">
            {(['kg', 'lbs'] as const).map(u => (
              <button
                key={u}
                className={settings.unit === u ? 'active' : ''}
                onClick={() => commit({ ...settings, unit: u })}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-row" onClick={() => commit({ ...settings, haptics: !settings.haptics })}>
          <div>
            <div className="pref-label">触感震动反馈</div>
            <div className="muted">完成打卡与计时器到期提醒</div>
          </div>
          <Switch checked={settings.haptics} />
        </div>

        <div className="pref-row" onClick={() => commit({ ...settings, autoWarmup: !settings.autoWarmup })}>
          <div>
            <div className="pref-label">自动推算热身组负荷</div>
            <div className="muted">根据正式组最高 PR 按比例生成</div>
          </div>
          <Switch checked={settings.autoWarmup} />
        </div>
      </section>

      <div className="data-actions">
        <button onClick={exportCSV}>
          <DownloadIcon size={15} />
          导出完整训练日志（CSV）
        </button>
        <button onClick={resetLibrary}>
          <RefreshIcon size={15} />
          恢复初始动作库
        </button>
      </div>

      <p className="foot-note">
        健身记录 v2.0 · 数据仅保存在本机，不上传任何服务器
      </p>
    </div>
  );
}

function Switch({ checked }: { checked: boolean }) {
  return (
    <span className={`switch ${checked ? 'on' : ''}`}>
      <span className="switch-thumb" />
    </span>
  );
}
