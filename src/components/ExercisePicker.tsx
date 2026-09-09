import { useMemo, useState } from 'react';
import { PART_NAMES } from '../db';
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from '../icons';
import type { BodyPart, LibraryExercise } from '../types';

interface Props {
  bodyPart: BodyPart;
  library: LibraryExercise[];
  addedIds: Set<number>;
  onAdd: (ex: LibraryExercise) => void;
  onClose: () => void;
}

/** 每个部位常用的目标肌群筛选 chips */
const MUSCLE_CHIPS: Record<BodyPart, string[]> = {
  胸: ['全部', '上胸', '胸大肌', '下胸', '胸缝'],
  背: ['全部', '背阔肌', '斜方', '中背', '后链'],
  腿: ['全部', '股四头肌', '腘绳肌', '臀大肌', '小腿'],
  肩: ['全部', '前束', '中束', '后束', '肩袖'],
  手臂: ['全部', '肱二头', '肱三头', '肱肌'],
};

export function ExercisePicker({ bodyPart, library, addedIds, onAdd, onClose }: Props) {
  const [kw, setKw] = useState('');
  const [chip, setChip] = useState('全部');
  const chips = MUSCLE_CHIPS[bodyPart] ?? ['全部'];

  const list = useMemo(() => {
    const partLib = library.filter(e => e.bodyPart === bodyPart);
    const q = kw.trim();
    return partLib.filter(e => {
      if (q && !(e.name + e.equipment + e.focus + e.tag).includes(q)) return false;
      if (chip !== '全部' && !(e.name + e.focus + e.tag).includes(chip)) return false;
      return true;
    });
  }, [library, bodyPart, kw, chip]);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={ev => ev.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <div className="sheet-title">
              选择动作 · {bodyPart}
              <span className="sheet-en">{PART_NAMES[bodyPart]}</span>
            </div>
            <div className="sheet-sub">
              已添加 {addedIds.size} 个动作 · 共 {library.filter(e => e.bodyPart === bodyPart).length} 个可用
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="search-box">
          <SearchIcon size={16} />
          <input
            placeholder="搜索动作名称、器械、目标肌群…"
            value={kw}
            onChange={ev => setKw(ev.target.value)}
          />
        </div>

        <div className="chip-row">
          {chips.map(c => (
            <button
              key={c}
              className={`chip ${chip === c ? 'active' : ''}`}
              onClick={() => setChip(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="sheet-list">
          {list.map(ex => {
            const added = addedIds.has(ex.id);
            return (
              <div key={ex.id} className="sheet-item">
                <div className="sheet-item-info">
                  <div className="sheet-item-name">{ex.name}</div>
                  <div className="sheet-item-meta">
                    {ex.equipment} · {ex.tag} · {ex.focus}
                  </div>
                </div>
                <button
                  className={added ? 'add-btn added' : 'add-btn'}
                  disabled={added}
                  onClick={() => onAdd(ex)}
                >
                  {added ? (
                    <>
                      <CheckIcon size={14} /> 已添加
                    </>
                  ) : (
                    <>
                      <PlusIcon size={14} /> 添加
                    </>
                  )}
                </button>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="sheet-empty">
              没有匹配的动作。可以去“设置 → 动作库管理”添加新动作。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
