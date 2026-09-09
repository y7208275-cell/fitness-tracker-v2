import type { Page } from '../types';
import { ChartIcon, DumbbellIcon, GearIcon, HomeIcon } from '../icons';
import type { ReactNode } from 'react';

interface Props {
  page: Page;
  onChange: (page: Page) => void;
}

const TABS: Array<{ key: Page; label: string; icon: (p: { size?: number }) => ReactNode }> = [
  { key: 'home', label: '今天', icon: HomeIcon },
  { key: 'workout', label: '训练', icon: DumbbellIcon },
  { key: 'history', label: '记录', icon: ChartIcon },
  { key: 'settings', label: '设置', icon: GearIcon },
];

export function BottomNav({ page, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const active = tab.key === page;
        return (
          <button
            key={tab.key}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            <tab.icon size={23} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
