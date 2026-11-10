import type { ReactNode } from 'react';
import { useSettings } from '../settings.ts';

export const SETTINGS_PANEL_ID = 'settings-panel';

/** 设置 popover (spec S2). Native popover = click-outside + Esc dismissal for free.
 *  `chart` is the 排盘 group's controls, which stay bound to App's URL state. */
export function SettingsPanel({ chart }: { chart: ReactNode }) {
  const { settings, set } = useSettings();
  return (
    <div id={SETTINGS_PANEL_ID} popover="auto" className="panel gold-frame text-xs"
         style={{ color: 'var(--text)', border: '1px solid var(--border)', padding: 16, minWidth: 240 }}>
      <div className="flex flex-col gap-4">
        <Group label="排盘">{chart}</Group>
        <Group label="奇门盘">
          <Check checked={settings.showMarks} onChange={(v) => set({ showMarks: v })}>显示 迫·墓·刑 标记</Check>
          <div className="flex items-center gap-2">
            <span>符号颜色：</span>
            {(['luck', 'element'] as const).map((m) => (
              <button key={m} className="seg rounded-lg px-2.5 py-1" data-active={settings.symbolColor === m}
                      aria-pressed={settings.symbolColor === m} onClick={() => set({ symbolColor: m })}>
                {m === 'luck' ? '吉凶' : '五行'}
              </button>
            ))}
          </div>
        </Group>
        <Group label="日历">
          <Check checked={settings.showLunar} onChange={(v) => set({ showLunar: v })}>农历</Check>
          <Check checked={settings.showDayGanzhi} onChange={(v) => set({ showDayGanzhi: v })}>日干支</Check>
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      {children}
    </div>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}
