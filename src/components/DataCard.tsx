interface DataCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'amber' | 'blue' | 'muted'
}

const ACCENT_VARS: Record<NonNullable<DataCardProps['accent']>, string> = {
  green:  'var(--green)',
  red:    'var(--red)',
  amber:  'var(--amber)',
  blue:   'var(--blue)',
  muted:  'var(--muted)',
}

export function DataCard({ label, value, sub, accent = 'green' }: DataCardProps) {
  return (
    <div className="data-card bg-[var(--surface-2)] border border-[var(--border)] rounded p-3 min-w-[120px]">
      <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1 font-mono">
        {label}
      </div>
      <div className="text-lg font-bold font-mono" style={{ color: ACCENT_VARS[accent] }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--muted)] mt-0.5 font-mono">{sub}</div>
      )}
    </div>
  )
}
