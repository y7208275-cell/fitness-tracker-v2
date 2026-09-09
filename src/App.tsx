import { useCallback, useEffect, useState } from 'react';
import { initDB, db, getSettings, getAllSessions } from './db';
import { HomePage } from './pages/HomePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { BottomNav } from './components/BottomNav';
import {
  buildWorkoutFromPlan,
  completedVolume,
  estimateKcal,
  newSet,
} from './utils';
import type {
  ActiveWorkout,
  AppSettings,
  BodyPart,
  LibraryExercise,
  Page,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from './types';

const DRAFT_KEY = 'ft2-active-workout';
const DRAFT_MAX_AGE = 12 * 60 * 60 * 1000;

function loadDraft(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ActiveWorkout;
    if (!draft?.bodyPart || !Array.isArray(draft.exercises) || typeof draft.startTimestamp !== 'number') {
      return null;
    }
    if (Date.now() - draft.startTimestamp > DRAFT_MAX_AGE) return null;
    return draft;
  } catch {
    return null;
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDB();
      const [s, lib, sess] = await Promise.all([
        getSettings(),
        db.exercises.orderBy('id').toArray(),
        getAllSessions(),
      ]);
      if (cancelled) return;
      setSettings(s);
      setLibrary(lib);
      setSessions(sess);
      setActiveWorkout(loadDraft());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistActive = useCallback((draft: ActiveWorkout | null) => {
    setActiveWorkout(draft);
    try {
      if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // 忽略存储失败
    }
  }, []);

  if (!ready || !settings) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">🏋️</div>
        <div>加载中…</div>
      </div>
    );
  }

  const cfg = settings;

  function startWorkout(bodyPart: BodyPart) {
    if (activeWorkout) {
      const ok = confirm(
        `已有进行中的${activeWorkout.bodyPart}训练，确定放弃并重新开始吗？`
      );
      if (!ok) return;
    }
    persistActive(buildWorkoutFromPlan(bodyPart, library, cfg.autoWarmup));
    setPage('workout');
  }

  function updateWorkout(mutator: (prev: WorkoutExercise[]) => WorkoutExercise[]) {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const next = { ...prev, exercises: mutator(prev.exercises) };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // 忽略
      }
      return next;
    });
  }

  function updateSet(
    exIdx: number,
    setIdx: number,
    patch: Partial<WorkoutSet>
  ) {
    updateWorkout(prev =>
      prev.map((we, i) =>
        i !== exIdx
          ? we
          : {
              ...we,
              sets: we.sets.map((s, j) => (j !== setIdx ? s : { ...s, ...patch })),
            }
      )
    );
  }

  function addSet(exIdx: number) {
    updateWorkout(prev =>
      prev.map((we, i) =>
        i !== exIdx ? we : { ...we, sets: [...we.sets, newSet()] }
      )
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    updateWorkout(prev => {
      const we = prev[exIdx];
      const sets = we.sets.filter((_, j) => j !== setIdx);
      if (sets.length === 0) {
        return prev.filter((_, i) => i !== exIdx);
      }
      return prev.map((w, i) => (i !== exIdx ? w : { ...w, sets }));
    });
  }

  function removeExercise(exIdx: number) {
    updateWorkout(prev => prev.filter((_, i) => i !== exIdx));
  }

  function addExercise(ex: LibraryExercise) {
    updateWorkout(prev => {
      const already = prev.find(e => e.exerciseId === ex.id);
      if (already) return prev;
      const we: WorkoutExercise = {
        id: Date.now(),
        exerciseId: ex.id,
        name: ex.name,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        tag: ex.tag,
        focus: ex.focus,
        restSec: cfg.defaultRestSec,
        planText: '',
        sets: [newSet()],
      };
      return [...prev, we];
    });
  }

  async function refreshSessions() {
    setSessions(await getAllSessions());
  }

  async function finishWorkout() {
    if (!activeWorkout) return;
    const doneAny = activeWorkout.exercises.some(e => e.sets.some(s => s.done));
    if (!doneAny) {
      alert('还没有完成任何一组。勾选“完成”后再结束训练，或选择放弃。');
      return;
    }
    const nowMs = Date.now();
    const durationMinutes = Math.max(1, Math.round((nowMs - activeWorkout.startTimestamp) / 60000));
    const ok = confirm(`本次训练已用时 ${Math.floor(durationMinutes)} 分钟，确定结束并保存到记录吗？`);
    if (!ok) return;
    const now = new Date(nowMs);
    const session: WorkoutSession = {
      date: now.toISOString().slice(0, 10),
      bodyPart: activeWorkout.bodyPart,
      title: activeWorkout.title,
      startTime: new Date(activeWorkout.startTimestamp).toISOString(),
      endTime: now.toISOString(),
      durationMinutes,
      volumeKg: completedVolume(activeWorkout.exercises),
      kcal: estimateKcal(durationMinutes),
      exercises: activeWorkout.exercises,
    };
    await db.workoutSessions.put(session);
    persistActive(null);
    await refreshSessions();
    setPage('history');
  }

  function abandonWorkout() {
    const ok = confirm('确定放弃本次训练？已记录的组不会保存。');
    if (!ok) return;
    persistActive(null);
    setPage('home');
  }

  function renderPage() {
    switch (page) {
      case 'home':
        return (
          <HomePage
            settings={cfg}
            library={library}
            sessions={sessions}
            activeWorkout={activeWorkout}
            onStartWorkout={startWorkout}
            onContinueWorkout={() => setPage('workout')}
            onOpenSettings={() => setPage('settings')}
          />
        );
      case 'workout':
        return (
          <WorkoutPage
            activeWorkout={activeWorkout}
            library={library}
            settings={cfg}
            sessions={sessions}
            onStartWorkout={startWorkout}
            onAddExercise={addExercise}
            onUpdateSet={updateSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemoveExercise={removeExercise}
            onFinishWorkout={finishWorkout}
            onAbandonWorkout={abandonWorkout}
          />
        );
      case 'history':
        return <HistoryPage sessions={sessions} />;
      case 'settings':
        return (
          <SettingsPage
            settings={cfg}
            library={library}
            sessions={sessions}
            onSettingsChange={async s => {
              setSettings(s);
              await db.appSettings.put({ ...s, id: 1 });
            }}
            onLibraryChange={list => setLibrary(list)}
          />
        );
    }
  }

  return (
    <div className="app-shell">
      <div className="page-scroll">{renderPage()}</div>
      <BottomNav page={page} onChange={setPage} />
    </div>
  );
}
