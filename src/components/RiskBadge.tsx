interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const RISK_CONFIG = {
  LOW: {
    label: 'LOW',
    color: 'text-terminal-green border-terminal-green',
    bg: 'bg-terminal-green/10',
    glow: '',
  },
  MEDIUM: {
    label: 'MEDIUM',
    color: 'text-terminal-amber border-terminal-amber',
    bg: 'bg-terminal-amber/10',
    glow: '',
  },
  HIGH: {
    label: 'HIGH',
    color: 'text-terminal-red border-terminal-red',
    bg: 'bg-terminal-red/10',
    glow: 'glow-red',
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: 'text-terminal-red border-terminal-red',
    bg: 'bg-terminal-red/20',
    glow: 'glow-red',
  },
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.MEDIUM

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-[10px] font-mono font-bold tracking-widest uppercase
        border rounded-sm ${cfg.color} ${cfg.bg} ${cfg.glow}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
      RISK: {cfg.label}
    </span>
  )
}

/** Parse [RISK: X] tags out of a text string and return the level */
export function parseRiskLevel(text: string): RiskBadgeProps['level'] | null {
  const match = text.match(/\[RISK:\s*(LOW|MEDIUM|HIGH|CRITICAL)\]/i)
  return match ? (match[1].toUpperCase() as RiskBadgeProps['level']) : null
}
