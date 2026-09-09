import { useMemo } from 'react';
import { ALL_PARTS, ROUTINE_TEMPLATES } from '../db';
import {
  dateISO,
  DAY_CHARS,
  DAY_FULL,
  daysBetween,
  estimateKcal,
  findBestRecord,
  fmtClock,
} from '../utils';
import { ChevronRightIcon, DumbbellIcon, FlameIcon, PlayIcon } from '../icons';
import type {
  ActiveWorkout,
  AppSettings,
  BodyPart,
  LibraryExercise,
  WorkoutSession,
} from '../types';

interface Props {
  settings: AppSettings;
  library: LibraryExercise[];
  sessions: WorkoutSession[];
  activeWorkout: ActiveWorkout | null;
  onStartWorkout: (part: BodyPart) => void;
  onContinueWorkout: () => void;
  onOpenSettings: () => void;
}

export function HomePage({
  settings,
  library,
  sessions,
  activeWorkout,
  onStartWorkout,
  onContinueWorkout,
  onOpenSettings,
}: Props) {
  const today = new Date();
  const dow = today.getDay();
  const todayStr = dateISO(today);

  const bodyPart = useMemo(
    () => settings.schedule.find(s => s.dayOfWeek === dow)?.bodyPart ?? null,
    [settings.schedule, dow]
  );

  const routine = bodyPart ? ROUTINE_TEMPLATES[bodyPart] : null;
  const planItems = routine
    ? routine.items
        .map(item => ({
          item,
          ex: library.find(e => e.id === item.exerciseId),
          best: findBestRecord(sessions, item.exerciseId),
        }))
        .filter(row => row.ex)
    : [];

  const lastSession = useMemo(() => {
    if (!bodyPart) return null;
    return (
      sessions
        .filter(s => s.bodyPart === bodyPart)
        .sort((a, b) => (b.date + (b.endTime || '')).localeCompare(a.date + (a.endTime || '')))[0] ?? null
    );
  }, [sessions, bodyPart]);

  const daysAgo = lastSession ? daysBetween(lastSession.date) : null;
  const totalSets = planItems.reduce((sum, row) => sum + row.item.sets, 0);
  const nowTs = Date.now();

  return (
    <div className="page home-page">
      <div className="page-head">
        <div>
          <div className="page-head-en">Today</div>
          <div className="page-head-date">
            {todayStr} · {DAY_FULL[dow]}
          </div>
        </div>
        {activeWorkout && (
          <button className="chip-ghost" onClick={onContinueWorkout}>
            <span className="dot-pulse" />
            训练中 {fmtClock(nowTs - activeWorkout.startTimestamp)}
          </button>
        )}
      </div>

      {bodyPart && routine ? (
        <>
          <section className="hero-card">
            <div className="hero-plan-label">
              <span className="tag-mini">{bodyPart}</span>
              <span>今日训练计划</span>
            </div>
            <h1 className="hero-title">{routine.title}</h1>
            <p className="hero-sub">
              {lastSession
                ? `上次练${bodyPart}：${lastSession.date.slice(5)}（${daysAgo === 0 ? '今天' : daysAgo + ' 天前'}）`
                : `第一次练${bodyPart}，从轻重量开始找到节奏`}
              {daysAgo !== null && daysAgo! >= 7 && lastSession && ' · 建议递增负荷 2.5kg'}
            </p>

            <div className="hero-stats">
              <div className="hero-stat">
                <b>{planItems.length}</b>
                <span>项动作</span>
              </div>
              <div className="hero-stat">
                <b>{routine.estimateMinutes}</b>
                <span>分钟</span>
              </div>
              <div className="hero-stat">
                <b>{totalSets}</b>
                <span>组总计</span>
              </div>
            </div>
            <div className="hero-extra">
              <span>预估消耗 {estimateKcal(routine.estimateMinutes)} kcal</span>
            </div>

            <button className="btn-main" onClick={() => onStartWorkout(bodyPart)}>
              <DumbbellIcon size={20} />
              开始今日{bodyPart}训练
            </button>
          </section>

          <section className="card week-card">
            <div className="card-head">
              <span>📅 本周循环排期</span>
              <button className="link-btn" onClick={onOpenSettings}>
                调整计划
                <ChevronRightIcon size={14} />
              </button>
            </div>
            <div className="week-grid">
              {[1, 2, 3, 4, 5, 6, 0].map(d => {
                const entry = settings.schedule.find(s => s.dayOfWeek === d);
                const part = entry?.bodyPart ?? null;
                const isToday = d === dow;
                return (
                  <div key={d} className={`week-cell ${isToday ? 'today' : ''} ${part ? '' : 'rest'}`}>
                    <div className="week-day">
                      {isToday ? '今日' : `周${DAY_CHARS[d]}`}
                    </div>
                    <div className="week-part">{part ?? '休'}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card list-card">
            <div className="card-head">
              <span>今日动作清单</span>
              <span className="muted">共 {planItems.length} 项</span>
            </div>
            {planItems.map((row, i) => (
              <div key={row.item.exerciseId} className="plan-row">
                <div className="plan-index">{i + 1}</div>
                <div className="plan-info">
                  <div className="plan-name-line">
                    <b>{row.ex!.name}</b>
                    <span className="tag-mini soft">{row.ex!.tag}</span>
                  </div>
                  <div className="plan-meta">
                    {row.item.planText}
                    {row.best
                      ? ` · 上次最好 ${row.best.weight}kg × ${row.best.reps}`
                      : ` · ${row.ex!.focus}`}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="warmup-card">
            <div className="warmup-icon">
              <FlameIcon size={20} />
            </div>
            <div>
              <b>热身建议</b>
              <p>{routine.warmupText}</p>
            </div>
          </section>
        </>
      ) : (
        <section className="hero-card rest-day">
          <div className="hero-plan-label">
            <span className="tag-mini soft">休息日</span>
            <span>今天不安排训练</span>
          </div>
          <h1 className="hero-title">给身体一点恢复时间 🌿</h1>
          <p className="hero-sub">拉伸、散步或睡个好觉，都是训练的一部分。</p>
          <div className="rest-actions">
            {ALL_PARTS.map(part => (
              <button key={part} className="btn-main ghost" onClick={() => onStartWorkout(part)}>
                {part}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeWorkout && (
        <button className="continue-bar" onClick={onContinueWorkout}>
          <span className="dot-pulse" />
          继续进行中的{activeWorkout.bodyPart}训练 · 已练 {fmtClock(nowTs - activeWorkout.startTimestamp)}
          <PlayIcon size={18} />
        </button>
      )}
    </div>
  );
}
