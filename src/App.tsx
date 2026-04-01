import { usePrivy } from '@privy-io/react-auth'
import { useCallback, useState } from 'react'
import { ChatWindow } from './components/ChatWindow'
import { WalletPanel } from './components/WalletPanel'
import { useMppPayment } from './hooks/useMppPayment'
import { WalletBar } from './components/WalletBar'

export default function App() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const [pendingQuery, setPendingQuery] = useState<string | undefined>()
  const [recentWallets, setRecentWallets] = useState<string[]>([])

  const { mppFetch, isReady, setupError, walletAddress } = useMppPayment()

  const handleWalletQuery = useCallback((addressOrQuery: string) => {
    const isAddress = /^0x[0-9a-fA-F]{40}$/.test(addressOrQuery.trim())
    setPendingQuery(
      isAddress
        ? `Analyze wallet ${addressOrQuery.trim()} for risk. Show token balances, NFTs, recent transactions, and give me a risk score with key findings.`
        : addressOrQuery,
    )
  }, [])

  const handleWalletDetected = useCallback((addr: string) => {
    setRecentWallets((prev) => [addr, ...prev.filter((a) => a !== addr)].slice(0, 10))
  }, [])

  const handleQueryConsumed = useCallback(() => {
    setPendingQuery(undefined)
  }, [])

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg)]">
        <div className="flex items-center gap-3 text-terminal-muted font-mono text-sm">
          <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
          Connecting…
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg)]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(var(--green) 1px, transparent 1px),
              linear-gradient(90deg, var(--green) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-8 text-center px-8 max-w-md">
          <div>
            <div className="font-display text-4xl font-extrabold text-terminal-green tracking-tight mb-2">
              ON-CHAIN ANALYST
            </div>
            <div className="text-xs font-mono text-terminal-muted uppercase tracking-widest">
              Crypto Forensics · Powered by AI
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {['Alchemy', 'Claude AI', 'MPP Payments'].map((f) => (
              <span
                key={f}
                className="text-[11px] font-mono px-2.5 py-1 border border-[var(--border-2)] text-terminal-muted rounded-sm"
              >
                {f}
              </span>
            ))}
          </div>

          <p className="text-sm font-mono text-terminal-muted leading-relaxed">
            Analyze any Ethereum wallet for risk signals, token exposure,
            whale patterns, and on-chain forensics. Each request is paid
            automatically from your Tempo wallet via MPP — no API keys needed.
          </p>

          <button
            onClick={login}
            className="
              w-full py-3 text-sm font-mono font-bold uppercase tracking-widest
              bg-terminal-green/10 border border-terminal-green/40 text-terminal-green
              rounded-lg hover:bg-terminal-green/20 hover:border-terminal-green/70
              transition-all duration-200 active:scale-[0.98]
            "
          >
            Connect Wallet → Login
          </button>

          <p className="text-[10px] font-mono text-terminal-muted/40">
            Email · Google · Twitter · MetaMask · Passkey
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex overflow-hidden">
      <WalletPanel
        onWalletQuery={handleWalletQuery}
        recentQueries={recentWallets}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <WalletBar
          walletAddress={walletAddress}
          userLabel={user?.email?.address ?? 'anon'}
          onLogout={logout}
        />
        <ChatWindow
          pendingQuery={pendingQuery}
          onQueryConsumed={handleQueryConsumed}
          onWalletDetected={handleWalletDetected}
          mppFetch={mppFetch}
          isReady={isReady}
          setupError={setupError}
        />
      </div>
    </div>
  )
}
