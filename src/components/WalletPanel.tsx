import { useState } from 'react'

interface WalletPanelProps {
  onWalletQuery: (address: string) => void
  recentQueries: string[]
}

function truncate(addr: string) {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function isValidAddress(val: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(val.trim())
}

export function WalletPanel({ onWalletQuery, recentQueries }: WalletPanelProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const addr = input.trim()
    if (!isValidAddress(addr)) {
      setError('Invalid Ethereum address')
      return
    }
    setError('')
    onWalletQuery(addr)
    setInput('')
  }

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
          <span className="font-display text-xs font-semibold text-terminal-green uppercase tracking-widest">
            On-Chain Analyst
          </span>
        </div>
        <p className="text-[10px] text-terminal-muted mt-1 font-mono">
          Powered by Anthropic × Alchemy
        </p>
      </div>

      {/* Wallet input */}
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <label className="block text-[10px] text-terminal-muted uppercase tracking-widest mb-2 font-mono">
          Analyse Wallet
        </label>
        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setError('') }}
            placeholder="0x…"
            className="
              w-full bg-[var(--bg)] border border-[var(--border-2)] rounded px-3 py-2
              text-xs font-mono text-terminal-text placeholder-terminal-muted/50
              focus:outline-none focus:border-terminal-green/50 focus:ring-1 focus:ring-terminal-green/20
              transition-colors
            "
          />
          {error && (
            <p className="text-[10px] text-terminal-red mt-1 font-mono">{error}</p>
          )}
          <button
            type="submit"
            className="
              mt-2 w-full py-1.5 text-xs font-mono font-semibold uppercase tracking-widest
              bg-terminal-green/10 border border-terminal-green/30 text-terminal-green
              rounded hover:bg-terminal-green/20 hover:border-terminal-green/60
              transition-all duration-150
            "
          >
            → Analyse
          </button>
        </form>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2 font-mono">
          Quick Queries
        </p>
        {[
          'Analyze this wallet for rug pull risk',
          'What tokens does this wallet hold?',
          'Show recent suspicious activity',
          'Calculate wallet risk score',
        ].map((q) => (
          <button
            key={q}
            onClick={() => onWalletQuery(q)}
            className="
              w-full text-left text-[11px] font-mono text-terminal-muted
              py-1.5 px-2 rounded hover:bg-[var(--surface-2)] hover:text-terminal-text
              transition-colors truncate
            "
          >
            › {q}
          </button>
        ))}
      </div>

      {/* Recent wallet queries */}
      {recentQueries.length > 0 && (
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <p className="text-[10px] text-terminal-muted uppercase tracking-widest mb-2 font-mono">
            Recent Wallets
          </p>
          {recentQueries.map((addr) => (
            <button
              key={addr}
              onClick={() => onWalletQuery(`Analyze wallet ${addr}`)}
              className="
                w-full text-left flex items-center gap-2 py-1.5 px-2 rounded
                hover:bg-[var(--surface-2)] transition-colors group
              "
            >
              <div className="w-1.5 h-1.5 rounded-full bg-terminal-green/40 group-hover:bg-terminal-green shrink-0" />
              <span className="text-[11px] font-mono text-terminal-muted group-hover:text-terminal-green truncate">
                {truncate(addr)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* MPP cost footer */}
      <div className="px-4 py-3 border-t border-[var(--border)] mt-auto">
        <p className="text-[10px] text-terminal-muted/60 font-mono leading-relaxed">
          0.002 USDC / message<br />
          0.001 USDC / on-chain call<br />
          <span className="text-terminal-green/40">via Tempo × MPP</span>
        </p>
      </div>
    </aside>
  )
}
