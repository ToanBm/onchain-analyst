import { useState } from 'react'

const BRIDGE_URL = 'https://bridge.tempo.xyz'

interface WalletBarProps {
  walletAddress: string | null
  userLabel: string
  onLogout: () => void
}

export function WalletBar({ walletAddress, userLabel, onLogout }: WalletBarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const short = walletAddress
    ? walletAddress.slice(0, 6) + '…' + walletAddress.slice(-4)
    : null

  return (
    <div className="flex items-center justify-end gap-3 px-5 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
      {/* User identity */}
      <span className="text-[11px] font-mono text-terminal-muted/50 hidden sm:block">
        {userLabel}
      </span>

      {walletAddress && (
        <>
          <div className="w-px h-3 bg-[var(--border-2)]" />

          {/* Embedded wallet address + copy */}
          <button
            onClick={handleCopy}
            title={walletAddress}
            className="flex items-center gap-1.5 text-[11px] font-mono text-terminal-muted hover:text-terminal-green transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green/50 shrink-0" />
            {copied ? (
              <span className="text-terminal-green">copied!</span>
            ) : (
              <span>{short}</span>
            )}
            {/* Copy icon */}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
            </svg>
          </button>

          {/* Deposit link → Tempo bridge */}
          <a
            href={`${BRIDGE_URL}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Bridge USDC.e to your Tempo wallet"
            className="text-[11px] font-mono text-terminal-muted hover:text-terminal-green transition-colors flex items-center gap-1"
          >
            deposit
            <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeWidth="2" strokeLinecap="round" />
              <polyline points="15 3 21 3 21 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="14" x2="21" y2="3" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </a>
        </>
      )}

      <div className="w-px h-3 bg-[var(--border-2)]" />

      <button
        onClick={onLogout}
        className="text-[11px] font-mono text-terminal-muted hover:text-terminal-red transition-colors"
      >
        logout
      </button>
    </div>
  )
}
