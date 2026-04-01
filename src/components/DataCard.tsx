interface DataCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'amber' | 'blue' | 'muted'
}

const ACCENT_COLORS = {
  green: 'text-terminal-green',
  red: 'text-terminal-red',
  amber: 'text-terminal-amber',
  blue: 'text-terminal-blue',
  muted: 'text-terminal-muted',
}

export function DataCard({ label, value, sub, accent = 'green' }: DataCardProps) {
  return (
    <div className="data-card bg-[var(--surface-2)] border border-[var(--border)] rounded p-3 min-w-[120px]">
      <div className="text-[10px] text-terminal-muted uppercase tracking-widest mb-1 font-mono">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${ACCENT_COLORS[accent]}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-terminal-muted mt-0.5 font-mono">{sub}</div>
      )}
    </div>
  )
}
