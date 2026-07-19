type Method = 'zhirun' | 'chaibu';

export function Controls(props: {
  dtLocal: string;
  onDt: (v: string) => void;
  method: Method;
  onMethod: (m: Method) => void;
  spiritVariant: boolean;
  onSpiritVariant: (b: boolean) => void;
  lateZi: boolean;
  onLateZi: (b: boolean) => void;
  onShiftHours: (delta: number) => void;
  onNow: () => void;
}) {
  const { dtLocal, onDt, method, onMethod, spiritVariant, onSpiritVariant, lateZi, onLateZi } = props;
  return (
    <div className="panel p-4 flex flex-col gap-4">
      {/* date/time + hour nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <button className="seg rounded-lg px-3 py-2 text-lg" title="上一时辰"
                onClick={() => props.onShiftHours(-2)}>←</button>
        <input type="datetime-local" className="field px-3 py-2 text-sm flex-1 min-w-[210px]"
               value={dtLocal} onChange={(e) => onDt(e.target.value)} />
        <button className="seg rounded-lg px-3 py-2 text-lg" title="下一时辰"
                onClick={() => props.onShiftHours(2)}>→</button>
        <button className="seg rounded-lg px-3 py-2 text-sm" onClick={props.onNow}>此刻</button>
      </div>

      {/* method */}
      <Segmented label="定局法"
        options={[{ v: 'zhirun', t: '置闰法' }, { v: 'chaibu', t: '拆补法' }]}
        value={method} onChange={(v) => onMethod(v as Method)} />

      {/* toggles */}
      <div className="flex gap-6 text-sm flex-wrap">
        <Toggle label="晚子时算次日" checked={lateZi} onChange={onLateZi} />
        <Toggle label="勾陈朱雀命名" checked={spiritVariant} onChange={onSpiritVariant} />
      </div>
    </div>
  );
}

function Segmented({ label, options, value, onChange }: {
  label: string; options: { v: string; t: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={o.v} className="seg rounded-lg px-4 py-1.5 text-sm"
                  data-active={value === o.v} onClick={() => onChange(o.v)}>{o.t}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (b: boolean) => void;
}) {
  return (
    <button className="seg rounded-lg px-3 py-1.5 text-sm" data-active={checked}
            onClick={() => onChange(!checked)}>
      <span className="mr-2">{checked ? '✓' : '○'}</span>{label}
    </button>
  );
}
