import { useState } from 'react'

const BRIDGE_URL = 'https://app.across.to/bridge-and-swap'

interface WalletBarProps {
  walletAddress: string | null
  userLabel: string
  onLogout: () => void
  isReady: boolean
  setupError: string | null
  messageCount: number
  onClear: () => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
  onMenuOpen: () => void
}

function SunIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" strokeWidth="2" />
      <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function WalletBar({
  walletAddress,
  userLabel,
  onLogout,
  isReady,
  setupError,
  messageCount,
  onClear,
  theme,
  onThemeToggle,
  onMenuOpen,
}: WalletBarProps) {
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
    <div className="flex items-center justify-between px-3 md:px-5 py-2 border-b border-[var(--border)] bg-[var(--surface)] min-h-[40px]">
      {/* Left: 3 dots + MPP status + message count */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="md:hidden p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors tap-target flex items-center justify-center"
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>

        {/* Terminal chrome dots */}
        <div className="hidden md:flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>

        {/* MPP status */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className={`text-[10px] font-mono uppercase tracking-widest ${setupError ? 'text-[var(--red-a80)]' : 'text-[var(--muted-a60)]'}`}>
            {setupError ? 'Wallet error' : isReady ? 'MPP ready' : 'Connecting…'}
          </span>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${setupError ? 'bg-[var(--red)]' : isReady ? 'bg-[var(--green)]' : 'bg-[var(--muted-a40)] animate-pulse'}`} />
        </div>

        {/* Message count + clear */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--muted-a50)] uppercase tracking-widest whitespace-nowrap">
            {messageCount} messages
          </span>
          {messageCount > 0 && (
            <button
              onClick={onClear}
              className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--red)] transition-colors"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Right: user / wallet / theme / logout */}
      <div className="flex items-center gap-2 md:gap-3 overflow-hidden">

        {/* User identity — desktop only */}
        <span className="text-[11px] font-mono text-[var(--muted-a50)] hidden md:block truncate max-w-[120px]">
          {userLabel}
        </span>

        {walletAddress && (
          <>
            <div className="hidden md:block w-px h-3 bg-[var(--border-2)]" />

            {/* Wallet address + copy */}
            <button
              onClick={handleCopy}
              title={walletAddress}
              className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted)] hover:text-[var(--green)] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-a50)] shrink-0" />
              {copied ? (
                <span className="text-[var(--green)]">copied!</span>
              ) : (
                <span>{short}</span>
              )}
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
              </svg>
            </button>

            {/* Deposit link */}
            <a
              href={BRIDGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Bridge USDC.e to your Tempo wallet"
              className="hidden md:flex text-[11px] font-mono text-[var(--muted)] hover:text-[var(--green)] transition-colors items-center gap-1"
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

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--green)] hover:bg-[var(--surface-2)] transition-colors tap-target flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <div className="w-px h-3 bg-[var(--border-2)]" />

        <button
          onClick={onLogout}
          className="text-[11px] font-mono text-[var(--muted)] hover:text-[var(--red)] transition-colors whitespace-nowrap"
        >
          logout
        </button>
      </div>
    </div>
  )
}
