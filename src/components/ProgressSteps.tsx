import type { ToolStep } from '../hooks/useChat'

const TOOL_LABELS: Record<string, string> = {
  alchemy_get_token_balances: 'Token balances',
  alchemy_get_asset_transfers: 'Transfer history',
  alchemy_get_token_price: 'Token price',
  parallel_search: 'Web search',
  fal_generate_chart: 'Generate chart',
}

const TOOL_ICONS: Record<string, string> = {
  alchemy_get_token_balances: 'A',
  alchemy_get_asset_transfers: 'A',
  alchemy_get_token_price: 'A',
  parallel_search: 'P',
  fal_generate_chart: 'F',
}

interface ProgressStepsProps {
  steps: ToolStep[]
  streaming: boolean
  hasContent: boolean
}

export function ProgressSteps({ steps, streaming, hasContent }: ProgressStepsProps) {
  if (steps.length === 0) return null

  const analysisStep = { name: 'analysis', done: !streaming || hasContent }

  const allSteps = [...steps, analysisStep]

  return (
    <div className="mb-3 flex flex-col gap-1.5">
      {allSteps.map((step, i) => {
        const isAnalysis = step.name === 'analysis'
        const label = isAnalysis ? 'Analyzing with Claude' : (TOOL_LABELS[step.name] ?? step.name)
        const icon = isAnalysis ? 'AI' : (TOOL_ICONS[step.name] ?? '•')
        const isActive = !step.done && (i === 0 || allSteps[i - 1].done)

        return (
          <div key={`${step.name}-${i}`} className="flex items-center gap-2">
            {/* Step indicator */}
            <div className={`
              w-5 h-5 rounded-sm flex items-center justify-center shrink-0 text-[8px] font-bold
              transition-all duration-300
              ${step.done
                ? 'bg-terminal-green/20 border border-terminal-green/60 text-terminal-green'
                : isActive
                  ? 'bg-terminal-green/10 border border-terminal-green/30 text-terminal-green/70'
                  : 'bg-transparent border border-[var(--border-2)] text-terminal-muted/30'
              }
            `}>
              {step.done ? (
                /* Checkmark */
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                icon
              )}
            </div>

            {/* Label */}
            <span className={`
              text-[11px] font-mono transition-colors duration-300
              ${step.done
                ? 'text-terminal-green'
                : isActive
                  ? 'text-terminal-muted/80'
                  : 'text-terminal-muted/30'
              }
            `}>
              {label}
              {isActive && (
                <span className="ml-1.5 inline-flex gap-0.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              )}
            </span>

            {/* Service tag */}
            {!isAnalysis && (
              <span className={`
                text-[9px] font-mono px-1.5 py-0.5 rounded-sm border transition-colors duration-300
                ${step.done
                  ? 'border-terminal-green/30 text-terminal-green/60'
                  : 'border-[var(--border-2)] text-terminal-muted/30'
                }
              `}>
                {step.name.startsWith('alchemy') ? 'Alchemy MPP'
                  : step.name === 'parallel_search' ? 'Parallel MPP'
                  : step.name === 'fal_generate_chart' ? 'fal.ai MPP'
                  : 'MPP'}
              </span>
            )}

          </div>
        )
      })}

      {/* Overall progress bar */}
      <div className="mt-1 h-px bg-[var(--border-2)] rounded-full overflow-hidden">
        <div
          className="h-full bg-terminal-green/50 rounded-full transition-all duration-500"
          style={{
            width: `${Math.round((allSteps.filter((s) => s.done).length / allSteps.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  )
}
