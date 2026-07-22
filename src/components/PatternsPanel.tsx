import { useMemo, useState } from 'react';
import {
  PATTERNS_AUSPICIOUS, PATTERNS_INAUSPICIOUS, PATTERNS_CONCEALMENT, PATTERNS_SANQI,
  type PatternRule, type Tier, type ApplicationTag,
} from '../calendar/data/patterns.ts';

// Reference + selector for the 格局 registry (architecture §5: "the Reference page
// and all UI badges render directly from this single source"). Browsing this list
// is also how a user will pick a 格局 to drive the By-formation search (§10.1) — the
// selected id is lifted to App so it can seed that flow later.

const CATEGORIES: { key: string; label: string; sub: string; rules: PatternRule[] }[] = [
  { key: 'ji', label: '吉格', sub: '天地干吉', rules: PATTERNS_AUSPICIOUS },
  { key: 'dun', label: '九遁', sub: '奇门遁蔽', rules: PATTERNS_CONCEALMENT },
  { key: 'sanqi', label: '三奇格', sub: '三奇结构', rules: PATTERNS_SANQI },
  { key: 'xiong', label: '凶格', sub: '天地干凶', rules: PATTERNS_INAUSPICIOUS },
];

const TIER_LABEL: Record<Tier, string> = {
  'supreme-auspicious': '大吉', 'auspicious': '吉', 'minor-auspicious': '小吉', 'neutral': '平',
  'conditional': '门吉则吉', 'minor-inauspicious': '小凶', 'inauspicious': '凶', 'supreme-inauspicious': '大凶',
};
const TIER_COLOR: Record<Tier, string> = {
  'supreme-auspicious': 'var(--q-excellent)', 'auspicious': 'var(--q-good)', 'minor-auspicious': 'var(--q-good)',
  'neutral': 'var(--q-neutral)', 'conditional': 'var(--q-caution)', 'minor-inauspicious': 'var(--q-caution)',
  'inauspicious': 'var(--q-bad)', 'supreme-inauspicious': 'var(--q-bad)',
};

const TAG_LABEL: Record<ApplicationTag, string> = {
  launch: '开业', contract: '签约', partnership: '合夥', wealth: '求财', expansion: '扩张',
  competition: '竞争', travel: '出行', career: '求职升迁', construction: '动土', romance: '婚姻',
  secrecy: '谋略', study: '文书',
};
const ALL_TAGS = Object.keys(TAG_LABEL) as ApplicationTag[];

export function PatternsPanel({ selectedId, onSelect }: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const [activity, setActivity] = useState<ApplicationTag | null>(null);
  const [onlyFavours, setOnlyFavours] = useState(true); // when an activity is picked

  const total = useMemo(
    () => CATEGORIES.reduce((n, c) => n + c.rules.length, 0), [],
  );

  const match = (r: PatternRule): boolean => {
    if (q) {
      const hay = `${r.name} ${r.nameEn} ${r.id} ${r.interpretation}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (activity) {
      const inFavours = r.guidance.favours.includes(activity);
      const inAvoid = r.guidance.avoid.includes(activity);
      if (onlyFavours ? !inFavours : !(inFavours || inAvoid)) return false;
    }
    return true;
  };

  const shown = CATEGORIES
    .map((c) => ({ ...c, rules: c.rules.filter(match) }))
    .filter((c) => c.rules.length > 0);
  const shownCount = shown.reduce((n, c) => n + c.rules.length, 0);

  return (
    <div className="panel p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold gold tracking-wider">格局注册表</h2>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Formations Registry · 择日择时用 · 共 {total} 格
        </span>
        {selectedId && (
          <button className="seg rounded-lg px-2.5 py-1 text-xs ml-auto" onClick={() => onSelect(null)}>
            清除选择 ✕
          </button>
        )}
      </div>

      {/* filters */}
      <div className="flex flex-col gap-2">
        <input
          className="field px-3 py-2 text-sm w-full"
          placeholder="搜索格局名 / 拼音 / 释义…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs mr-1" style={{ color: 'var(--text-dim)' }}>用事</span>
          <button className="seg rounded-lg px-2.5 py-1 text-xs" data-active={activity === null}
                  onClick={() => setActivity(null)}>全部</button>
          {ALL_TAGS.map((t) => (
            <button key={t} className="seg rounded-lg px-2.5 py-1 text-xs" data-active={activity === t}
                    onClick={() => setActivity((a) => (a === t ? null : t))}>{TAG_LABEL[t]}</button>
          ))}
          {activity && (
            <button className="seg rounded-lg px-2.5 py-1 text-xs ml-1" data-active={!onlyFavours}
                    onClick={() => setOnlyFavours((v) => !v)}
                    title="包含「忌」此用事的格局">
              {onlyFavours ? '仅宜' : '宜+忌'}
            </button>
          )}
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
        显示 {shownCount} / {total} 格{selectedId ? ' · 已选 1' : ''}
      </div>

      {/* grouped list */}
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
        {shown.map((c) => (
          <section key={c.key} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2 sticky top-0 py-1"
                 style={{ background: 'var(--bg-panel)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.label}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{c.sub} · {c.rules.length}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {c.rules.map((r) => (
                <PatternCard key={r.id} rule={r} selected={r.id === selectedId}
                             onClick={() => onSelect(r.id === selectedId ? null : r.id)} />
              ))}
            </div>
          </section>
        ))}
        {shownCount === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-dim)' }}>
            无匹配格局，调整筛选条件。
          </div>
        )}
      </div>
    </div>
  );
}

function PatternCard({ rule, selected, onClick }: {
  rule: PatternRule; selected: boolean; onClick: () => void;
}) {
  const color = TIER_COLOR[rule.tier];
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-3 flex flex-col gap-1.5 transition-colors"
      style={{
        border: `1px solid ${selected ? color : 'var(--border)'}`,
        background: selected ? 'var(--bg-cell)' : 'transparent',
        boxShadow: selected ? `0 0 0 1px ${color} inset` : 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{rule.name}</span>
        <span className="text-[10px] leading-none px-1.5 py-0.5 rounded"
              style={{ color, border: `1px solid ${color}66` }}>{TIER_LABEL[rule.tier]}</span>
        {rule.confidence === 'variant' && (
          <span className="text-[10px]" style={{ color: 'var(--q-caution)' }} title="各家定义有异，建议先确认">⚠</span>
        )}
        <span className="text-[11px] ml-auto" style={{ color: 'var(--text-dim)' }}>{rule.nameEn}</span>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        {selected ? rule.interpretation : truncate(rule.interpretation, 48)}
      </p>

      {(rule.guidance.favours.length > 0 || rule.guidance.avoid.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {rule.guidance.favours.map((t) => (
            <Tag key={`f${t}`} label={`宜 ${TAG_LABEL[t]}`} color="var(--q-good)" />
          ))}
          {rule.guidance.avoid.map((t) => (
            <Tag key={`a${t}`} label={`忌 ${TAG_LABEL[t]}`} color="var(--q-bad)" />
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-1 flex flex-col gap-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {rule.notes && <span>注：{rule.notes}</span>}
          <span style={{ opacity: 0.7 }}>id: {rule.id} · scope: {rule.scope} · 来源 {rule.source}</span>
        </div>
      )}
    </button>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] leading-none px-1.5 py-0.5 rounded"
          style={{ color, background: `${color}1a` }}>{label}</span>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
