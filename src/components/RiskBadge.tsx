export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
}

const RISK_CONFIG: Record<RiskLevel, { dot: string; text: string; description: string }> = {
  LOW:      { dot: 'bg-terminal-green',  text: 'text-terminal-green',  description: 'Minimal on-chain risk signals' },
  MEDIUM:   { dot: 'bg-terminal-amber',  text: 'text-terminal-amber',  description: 'Some patterns warrant attention' },
  HIGH:     { dot: 'bg-terminal-red',    text: 'text-terminal-red',    description: 'Multiple active risk indicators' },
  CRITICAL: { dot: 'bg-terminal-red',    text: 'text-terminal-red',    description: 'Immediate red flags, avoid interaction' },
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.MEDIUM

  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm">
      {score !== undefined && (
        <span className="text-terminal-text font-bold">{score}/100</span>
      )}
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span className={`font-bold tracking-widest uppercase ${cfg.text}`}>{level}</span>
      <span className="text-terminal-muted font-bold">{cfg.description}</span>
    </span>
  )
}

/** Parse [RISK: LEVEL:SCORE] or [RISK: LEVEL] tags from a text string */
export function parseRiskLevel(text: string): { level: RiskLevel; score?: number } | null {
  const match = text.match(/\[RISK:\s*(LOW|MEDIUM|HIGH|CRITICAL)(?::(\d+))?\]/i)
  if (!match) return null
  return {
    level: match[1].toUpperCase() as RiskLevel,
    score: match[2] !== undefined ? parseInt(match[2], 10) : undefined,
  }
}
