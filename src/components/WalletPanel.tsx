import { useState } from 'react'

interface WalletPanelProps {
  onWalletQuery: (address: string) => void
  recentQueries: string[]
  /** Mobile drawer state */
  isOpen: boolean
  onClose: () => void
}

function truncate(addr: string) {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function isValidAddress(val: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(val.trim())
}

export function WalletPanel({ onWalletQuery, recentQueries, isOpen, onClose }: WalletPanelProps) {
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
    onClose()
  }

  const handleQuickQuery = (q: string) => {
    onWalletQuery(q)
    onClose()
  }

  const panelContent = (
    <aside className="w-full h-full border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="font-display text-xs font-semibold text-[var(--green)] uppercase tracking-widest">
              On-Chain Analyst
            </span>
          </div>
          <p className="text-[10px] text-[var(--muted)] mt-1 font-mono">
            Powered by Anthropic × Alchemy
          </p>
        </div>

        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Wallet input */}
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <label className="block text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2 font-mono">
          Analyse Wallet
        </label>
        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setError('') }}
            placeholder="0x…"
            className="
              w-full bg-[var(--bg)] border border-[var(--border-2)] rounded px-3 py-2
              text-xs font-mono text-[var(--text)] placeholder-[var(--muted-a50)]
              focus:outline-none focus:border-[var(--green-a50)] focus:ring-1 focus:ring-[var(--green-a20)]
              transition-colors
            "
          />
          {error && (
            <p className="text-[10px] text-[var(--red)] mt-1 font-mono">{error}</p>
          )}
          <button
            type="submit"
            className="
              mt-2 w-full py-2 text-xs font-mono font-semibold uppercase tracking-widest
              bg-[var(--green-a10)] border border-[var(--green-a30)] text-[var(--green)]
              rounded hover:bg-[var(--green-a20)] hover:border-[var(--green-a60)]
              transition-all duration-150
            "
          >
            → Analyse
          </button>
        </form>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2 font-mono">
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
            onClick={() => handleQuickQuery(q)}
            className="
              w-full text-left text-[11px] font-mono text-[var(--muted)]
              py-2 px-2 rounded hover:bg-[var(--surface-2)] hover:text-[var(--text)]
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
          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2 font-mono">
            Recent Wallets
          </p>
          {recentQueries.map((addr) => (
            <button
              key={addr}
              onClick={() => { onWalletQuery(`Analyze wallet ${addr}`); onClose() }}
              className="
                w-full text-left flex items-center gap-2 py-2 px-2 rounded
                hover:bg-[var(--surface-2)] transition-colors group
              "
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-a40)] group-hover:bg-[var(--green)] shrink-0" />
              <span className="text-[11px] font-mono text-[var(--muted)] group-hover:text-[var(--green)] truncate">
                {truncate(addr)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* MPP cost footer */}
      <div className="px-4 py-3 border-t border-[var(--border)] mt-auto">
        <p className="text-[10px] text-[var(--muted-a60)] font-mono leading-relaxed">
          0.002 USDC / message<br />
          0.001 USDC / on-chain call<br />
          <span className="text-[var(--green-a40)]">via Tempo × MPP</span>
        </p>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:flex w-64 shrink-0 h-full">
        {panelContent}
      </div>

      {/* Mobile: drawer overlay */}
      <div
        className={`drawer-backdrop md:hidden ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`sidebar-drawer md:hidden ${isOpen ? 'is-open' : ''}`}>
        {panelContent}
      </div>
    </>
  )
}
