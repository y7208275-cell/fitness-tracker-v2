import { useMemo, useState } from 'react';
import { dateISO, DAY_FULL, formatVolume } from '../utils';
import { ChevronDownIcon, ChevronRightIcon, InfoIcon, TrophyIcon } from '../icons';
import type { WorkoutSession } from '../types';

interface Props {
  sessions: WorkoutSession[];
}

interface DayGroup {
  date: string;
  weekday: string;
  sessions: WorkoutSession[];
  totalMinutes: number;
  volumeKg: number;
  prs: Array<{ exerciseName: string; weight: number; reps: number }>;
}

const FILTERS = ['全部', '胸部', '背部', '腿部', '肩部', '手臂'] as const;
const PART_MAP: Record<string, string> = { 胸部: '胸', 背部: '背', 腿部: '腿', 肩部: '肩', 手臂: '手臂' };

function groupByDate(sessions: WorkoutSession[]): DayGroup[] {
  const asc = [...sessions].sort((a, b) =>
    (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || ''))
  );
  const bestByExercise = new Map<number, { weight: number; reps: number }>();

  const map = new Map<string, DayGroup>();
  for (const s of sessions) {
    const g = map.get(s.date) ?? {
      date: s.date,
      weekday: DAY_FULL[new Date(s.date + 'T00:00:00').getDay()],
      sessions: [],
      totalMinutes: 0,
      volumeKg: 0,
      prs: [],
    };
    g.sessions.push(s);
    map.set(s.date, g);
  }

  // 遍历升序会话，检测个人新纪录
  for (const s of asc) {
    const group = map.get(s.date);
    if (!group) continue;
    for (const e of s.exercises) {
      const prev = bestByExercise.get(e.exerciseId);
      const bestSet = [...e.sets]
        .filter(x => x.done && x.weight > 0 && x.reps > 0)
        .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
      if (bestSet && (!prev || bestSet.weight > prev.weight)) {
        group.prs.push({ exerciseName: e.name, weight: bestSet.weight, reps: bestSet.reps });
        bestByExercise.set(e.exerciseId, { weight: bestSet.weight, reps: bestSet.reps });
      } else if (prev && bestSet && bestSet.weight === prev.weight && bestSet.reps > prev.reps) {
        bestByExercise.set(e.exerciseId, { weight: bestSet.weight, reps: bestSet.reps });
      }
    }
  }

  return Array.from(map.entries())
    .map(([, g]) => {
      g.sessions.sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
      g.totalMinutes = g.sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      g.volumeKg = g.sessions.reduce((sum, s) => sum + (s.volumeKg || 0), 0);
      return g;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function sessionMeta(exercises: WorkoutSession['exercises'], weightUnit: string) {
  return exercises.map(e => {
    const done = e.sets.filter(s => s.done);
    const all = done.length ? done : e.sets;
    const maxW = Math.max(0, ...all.map(s => s.weight));
    const maxReps = Math.max(0, ...all.map(s => s.reps));
    const label = maxW > 0
      ? `${all.length}组 × ${maxW}${weightUnit}`
      : `${all.length}组 × ${maxReps || '—'}次`;
    return { name: e.name, label };
  });
}

export function HistoryPage({ sessions }: Props) {
  const [filter, setFilter] = useState<string>('全部');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pop, setPop] = useState<'vol' | 'avg' | null>(null);

  const filtered = useMemo(
    () =>
      filter === '全部'
        ? sessions
        : sessions.filter(s => s.bodyPart === PART_MAP[filter]),
    [sessions, filter]
  );

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const metrics = useMemo(() => {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYm = prev.toISOString().slice(0, 7);
    const monthCount = sessions.filter(s => s.date.startsWith(ym)).length;
    const prevMonthCount = sessions.filter(s => s.date.startsWith(prevYm)).length;
    const totalVolume = sessions.reduce((sum, s) => sum + (s.volumeKg || 0), 0);
    const prevVolume = sessions
      .filter(s => s.date.startsWith(prevYm))
      .reduce((sum, s) => sum + (s.volumeKg || 0), 0);
    const avgMin = sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / sessions.length)
      : 0;
    return {
      count: sessions.length,
      monthDelta: monthCount - prevMonthCount,
      totalVolume,
      volumeUp: totalVolume > prevVolume,
      avgMin,
    };
  }, [sessions]);

  function toggle(date: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const todayISO = dateISO(new Date());

  return (
    <div className="page history-page">
      <div className="page-head-en">Logs</div>
      <h1 className="page-title-cn">历史记录统计</h1>

      <section className="stats-row">
        <div className="stat-card">
          <b>{metrics.count}</b>
          <span>训练次数</span>
          <em className={metrics.monthDelta >= 0 ? 'up' : 'down'}>
            {metrics.monthDelta >= 0 ? '+' : ''}{metrics.monthDelta} 本月
          </em>
        </div>
        <div className="stat-card accent">
          <b>{formatVolume(metrics.totalVolume)}</b>
          <span>总容量</span>
          <button
            className="stat-info-btn"
            onClick={ev => {
              ev.stopPropagation();
              setPop(p => (p === 'vol' ? null : 'vol'));
            }}
          >
            <InfoIcon size={13} />
          </button>
          {pop === 'vol' && (
            <div className="stat-pop" onClick={ev => ev.stopPropagation()}>
              总容量 = 所有已完成组（重量 × 次数）的总和。例如 60kg × 10 次 = 600kg，1000kg 显示为 1t。
            </div>
          )}
          <em className={metrics.volumeUp ? 'up' : ''}>
            {metrics.volumeUp ? '超额达标' : '稳步积累'}
          </em>
        </div>
        <div className="stat-card">
          <b>{metrics.avgMin}</b>
          <span>平均时长</span>
          <button
            className="stat-info-btn"
            onClick={ev => {
              ev.stopPropagation();
              setPop(p => (p === 'avg' ? null : 'avg'));
            }}
          >
            <InfoIcon size={13} />
          </button>
          {pop === 'avg' && (
            <div className="stat-pop" onClick={ev => ev.stopPropagation()}>
              平均时长 = 所有训练总用时 ÷ 训练次数，包含组间休息与热身时间。
            </div>
          )}
          <em>分/次</em>
        </div>
      </section>

      {pop && <div className="stat-pop-dismiss" onClick={() => setPop(null)} />}

      <div className="filter-row">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>还没有训练记录</p>
          <p className="muted">去“训练”页完成第一次打卡吧 💪</p>
        </div>
      )}

      {groups.map(group => {
        const isOpen = expanded.has(group.date);
        const head = group.sessions[0];
        const weightUnit = 'kg';
        return (
          <section key={group.date} className="day-card">
            <div className="day-head">
              <div>
                <span className="day-date">{group.date}</span>
                <span className="day-week">{group.date === todayISO ? `今天${group.weekday}` : group.weekday}</span>
              </div>
              <span className="day-meta">
                {group.totalMinutes} 分钟 · {group.sessions.length} 次
              </span>
            </div>
            <div className="day-title">{head.title}</div>

            <div className="day-badges">
              <span className="day-vol">
                {head.exercises.length} 个动作 · {formatVolume(group.volumeKg)}
              </span>
              <span className="day-dur">⏱ {group.totalMinutes} 分钟</span>
            </div>

            {group.prs.length > 0 && (
              <div className="pr-banner">
                <TrophyIcon size={16} />
                <span>
                  {group.prs.map(pr => `${pr.exerciseName}破新高 ${pr.weight}kg×${pr.reps}次`).join('；')}
                </span>
              </div>
            )}

            <div className="day-ex-grid">
              {sessionMeta(head.exercises, weightUnit).map(m => (
                <div key={m.name} className="day-ex">
                  <span className="day-ex-name">{m.name}</span>
                  <span className="day-ex-meta">{m.label}</span>
                </div>
              ))}
            </div>

            <button className="detail-toggle" onClick={() => toggle(group.date)}>
              {isOpen ? '收起明细' : '查看各组重量明细'}
              {isOpen ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
            </button>

            {isOpen &&
              head.exercises.map(e => (
                <div key={e.id} className="detail-block">
                  <div className="detail-name">{e.name}</div>
                  {e.sets.filter(s => s.done).length > 0 ? (
                    e.sets
                      .filter(s => s.done)
                      .map((s, i) => (
                        <div key={s.id} className="detail-row">
                          <span>{i + 1}</span>
                          <span>{s.warmup ? '热身 ' : ''}{s.drop ? '递减 ' : ''}</span>
                          <span>{s.weight > 0 ? `${s.weight} kg` : '自重'}</span>
                          <span>× {s.reps} 次</span>
                        </div>
                      ))
                  ) : (
                    <div className="muted">（该动作无已完成组）</div>
                  )}
                </div>
              ))}
          </section>
        );
      })}

      {sessions.length > 0 && (
        <p className="history-foot">
          {filter === '全部'
            ? `已加载 ${sessions.length} 条记录，继续保持超越 🔥`
            : `已显示全部${filter}记录`}
        </p>
      )}
    </div>
  );
}
