import { useEffect, useState } from 'react';
import { ALL_PARTS, PART_EN, ROUTINE_TEMPLATES } from '../db';
import { ExercisePicker } from '../components/ExercisePicker';
import { getGuide } from '../guides';
import {
  completedVolume,
  findBestRecord,
  fmtClock,
  fmtSeconds,
  formatVolume,
  fromDisplay,
  toDisplay,
  vibrate,
} from '../utils';
import {
  CheckIcon,
  DumbbellIcon,
  FlameIcon,
  InfoIcon,
  PlayIcon,
  PlusIcon,
  SkipIcon,
  TimerIcon,
  TrashIcon,
} from '../icons';
import type {
  ActiveWorkout,
  AppSettings,
  BodyPart,
  LibraryExercise,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '../types';

interface Props {
  activeWorkout: ActiveWorkout | null;
  library: LibraryExercise[];
  settings: AppSettings;
  sessions: WorkoutSession[];
  onStartWorkout: (part: BodyPart) => void;
  onAddExercise: (ex: LibraryExercise) => void;
  onUpdateSet: (exIdx: number, setIdx: number, patch: Partial<WorkoutSet>) => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onRemoveExercise: (exIdx: number) => void;
  onFinishWorkout: () => void;
  onAbandonWorkout: () => void;
}

export function WorkoutPage({
  activeWorkout,
  library,
  settings,
  sessions,
  onStartWorkout,
  onAddExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onFinishWorkout,
  onAbandonWorkout,
}: Props) {
  const [nowTs, setNowTs] = useState(Date.now());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showSetHelp, setShowSetHelp] = useState(false);
  const [guideEx, setGuideEx] = useState<WorkoutExercise | null>(null);
  const [rest, setRest] = useState<{ endAt: number; totalSec: number } | null>(null);

  const part = activeWorkout?.bodyPart ?? null;
  const exercises = activeWorkout?.exercises ?? [];
  const volume = completedVolume(exercises);

  useEffect(() => {
    if (!activeWorkout) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startTimestamp]);

  const restLeft = rest ? Math.max(0, Math.ceil((rest.endAt - nowTs) / 1000)) : 0;

  useEffect(() => {
    if (!rest) return;
    if (restLeft > 0) return;
    setRest(null);
    if (settings.haptics) vibrate(80);
  }, [restLeft, rest, settings.haptics]);

  if (!activeWorkout || !part) {
    const todayDow = new Date().getDay();
    const todayPart = settings.schedule.find(s => s.dayOfWeek === todayDow)?.bodyPart ?? null;
    return (
      <div className="page workout-start-page">
        <div className="page-head-en">Workout</div>
        <h1 className="start-title">今天练什么？</h1>
        <p className="start-sub">选择部位后立即开始计时，动作可以边练边加</p>

        {todayPart && (
          <button className="today-plan-card" onClick={() => onStartWorkout(todayPart)}>
            <div>
              <div className="today-plan-label">
                今日计划 · {PART_EN[todayPart]}
              </div>
              <div className="today-plan-name">{ROUTINE_TEMPLATES[todayPart].title}</div>
              <div className="today-plan-meta">
                {ROUTINE_TEMPLATES[todayPart].items.length} 个动作 · 约 {ROUTINE_TEMPLATES[todayPart].estimateMinutes} 分钟
              </div>
            </div>
            <PlayIcon size={22} />
          </button>
        )}

        <div className="part-picker-grid">
          {ALL_PARTS.map(p => (
            <button key={p} className="part-pick-card" onClick={() => onStartWorkout(p)}>
              <span className="part-pick-char">{p}</span>
              <span className="part-pick-en">{PART_EN[p]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const elapsedSec = Math.max(0, Math.floor((nowTs - activeWorkout.startTimestamp) / 1000));
  const addedIds = new Set(exercises.map(e => e.exerciseId));

  function startRest(restSec: number) {
    setRest({ endAt: Date.now() + restSec * 1000, totalSec: restSec });
  }

  function handleToggleDone(exIdx: number, setIdx: number, done: boolean) {
    const ex = exercises[exIdx];
    onUpdateSet(exIdx, setIdx, { done: !done });
    if (!done && settings.autoStartRest && !rest) {
      startRest(ex.restSec);
    }
  }

  return (
    <div className="page workout-page">
      <div className="workout-top">
        <div>
          <div className="page-head-en">Workout</div>
          <div className="workout-part">
            {part}
            <span className="tag-mini soft">训练进行中</span>
          </div>
          <div className="workout-title">{activeWorkout.title}</div>
        </div>
        <div className="workout-side">
          <div className="workout-clock">{fmtClock(nowTs - activeWorkout.startTimestamp)}</div>
          <div className="workout-volume">
            <FlameIcon size={13} />
            容量 {formatVolume(volume)}
          </div>
        </div>
      </div>

      {rest && restLeft > 0 ? (
        <div className="rest-card">
          <div className="rest-info">
            <span className="rest-icon">
              <TimerIcon size={15} />
            </span>
            <span>组间休息计时</span>
          </div>
          <div className="rest-time">
            <b>{fmtSeconds(restLeft)}</b>
            <span>/ {fmtSeconds(rest.totalSec)}</span>
          </div>
          <div className="rest-actions">
            <button onClick={() => setRest(r => r && { ...r, endAt: r.endAt + 30000, totalSec: r.totalSec + 30 })}>
              +30s
            </button>
            <button onClick={() => setRest(null)}>
              <SkipIcon size={13} /> 跳过
            </button>
          </div>
        </div>
      ) : (
        <div className="rest-card idle">
          <span className="rest-icon">
            <TimerIcon size={15} />
          </span>
          <span>组间休息计时</span>
          <span className="muted">完成一组后自动开始</span>
        </div>
      )}

      {exercises.map((we, exIdx) => {
        const best = findBestRecord(sessions, we.exerciseId);
        const doneCount = we.sets.filter(s => s.done).length;
        return (
          <section key={we.id} className="card ex-card">
            <div className="ex-head">
              <div>
                <div className="ex-name">
                  {we.name}
                  <button
                    className="ex-info-btn"
                    title="动作做法与要领"
                    onClick={() => setGuideEx(we)}
                  >
                    <InfoIcon size={14} />
                  </button>
                  {we.tag && <span className="tag-mini soft">{we.tag}</span>}
                  <span className="ex-progress">
                    {doneCount}/{we.sets.length} 组
                  </span>
                </div>
                <div className="ex-meta">
                  建议休息 {we.restSec}s
                  {best ? ` · 上次最佳：${best.weight}kg × ${best.reps}` : ` · ${we.focus}`}
                </div>
              </div>
              <button
                className="icon-btn danger"
                title="删除该动作"
                onClick={() => onRemoveExercise(exIdx)}
              >
                <TrashIcon size={16} />
              </button>
            </div>

            <div className="set-grid set-head">
              <span>组数</span>
              <span>重量({settings.unit})</span>
              <span>次数</span>
              <button
                className="help-head-btn"
                onClick={() => setShowSetHelp(true)}
                title="每组标记说明"
              >
                <InfoIcon size={13} />
              </button>
            </div>

            {we.sets.map((set, setIdx) => {
              const weightDisplay = set.weight > 0 ? toDisplay(set.weight, settings.unit) : '';
              return (
                <div key={set.id} className={`set-grid set-row ${set.done ? 'done' : ''}`}>
                  <div className="set-no">
                    {setIdx + 1}
                    {set.warmup && <span className="flag-w" title="热身组">W</span>}
                    {set.drop && <span className="flag-d" title="递减组">↓</span>}
                  </div>
                  <input
                    className="set-input"
                    inputMode="decimal"
                    placeholder="—"
                    value={weightDisplay}
                    onChange={ev => {
                      const v = parseFloat(ev.target.value);
                      onUpdateSet(exIdx, setIdx, { weight: Number.isFinite(v) ? fromDisplay(v, settings.unit) : 0 });
                    }}
                  />
                  <input
                    className="set-input"
                    inputMode="numeric"
                    placeholder="—"
                    value={set.reps || ''}
                    onChange={ev => {
                      const v = parseInt(ev.target.value);
                      onUpdateSet(exIdx, setIdx, { reps: Number.isFinite(v) ? v : 0 });
                    }}
                  />
                  <div className="set-ctrl">
                    <button
                      className={`mini-toggle ${set.warmup ? 'on' : ''}`}
                      title="热身组"
                      onClick={() => onUpdateSet(exIdx, setIdx, { warmup: !set.warmup })}
                    >
                      W
                    </button>
                    <button
                      className={`mini-toggle drop ${set.drop ? 'on' : ''}`}
                      title="递减组"
                      onClick={() => onUpdateSet(exIdx, setIdx, { drop: !set.drop })}
                    >
                      ↓
                    </button>
                    <button
                      className={`done-btn ${set.done ? 'done' : ''}`}
                      onClick={() => handleToggleDone(exIdx, setIdx, set.done)}
                    >
                      {set.done && <CheckIcon size={16} />}
                    </button>
                    <button
                      className="icon-btn faint"
                      title="删除本组"
                      onClick={() => onRemoveSet(exIdx, setIdx)}
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            <button className="add-set-btn" onClick={() => onAddSet(exIdx)}>
              <PlusIcon size={14} /> 加组
            </button>
          </section>
        );
      })}

      {exercises.length === 0 && (
        <div className="empty-workout">
          <DumbbellIcon size={36} />
          <p>计时已开始，先添加第一个动作吧</p>
        </div>
      )}

      <button className="add-exercise-btn" onClick={() => setPickerOpen(true)}>
        <PlusIcon size={16} />
        添加训练动作
      </button>

      <div className="workout-foot">
        <button className="finish-btn" onClick={onFinishWorkout}>
          <CheckIcon size={18} />
          完成训练并记录（已用时 {fmtClock(elapsedSec * 1000)}）
        </button>
        <button className="abandon-btn" onClick={onAbandonWorkout}>
          放弃本次训练
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          bodyPart={part}
          library={library}
          addedIds={addedIds}
          onAdd={ex => onAddExercise(ex)}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {showSetHelp && (
        <div className="help-overlay" onClick={() => setShowSetHelp(false)}>
          <div className="help-pop" onClick={ev => ev.stopPropagation()}>
            <div className="help-pop-title">每组右侧标记说明</div>
            <div className="help-item">
              <span className="help-mark">W</span>
              <div>
                <b>热身组</b>
                <p>用较轻重量激活肌肉的准备组，通常做正式组之前。</p>
              </div>
            </div>
            <div className="help-item">
              <span className="help-mark drop">↓</span>
              <div>
                <b>递减组</b>
                <p>力竭后立刻降低重量继续做，用来更深度刺激肌肉。</p>
              </div>
            </div>
            <div className="help-item">
              <span className="help-mark done">
                <CheckIcon size={14} />
              </span>
              <div>
                <b>已完成</b>
                <p>表示这组已做完：计入记录并自动开始休息倒计时。</p>
              </div>
            </div>
            <button className="help-close" onClick={() => setShowSetHelp(false)}>
              知道了
            </button>
          </div>
        </div>
      )}

      {guideEx && (
        <div className="help-overlay" onClick={() => setGuideEx(null)}>
          <div className="help-pop guide-pop" onClick={ev => ev.stopPropagation()}>
            <div className="guide-pop-head">
              <div className="help-pop-title">{guideEx.name}</div>
              <div className="guide-meta">
                {guideEx.equipment} · {guideEx.tag} · {guideEx.focus}
              </div>
            </div>
            <div className="guide-sec">
              <b>做法</b>
              <p>{getGuide(guideEx.name).how}</p>
            </div>
            <div className="guide-sec">
              <b>要领</b>
              <p>{getGuide(guideEx.name).key}</p>
            </div>
            <button className="help-close" onClick={() => setGuideEx(null)}>
              知道了
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
