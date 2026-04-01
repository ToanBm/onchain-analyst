import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import type { MppFetch } from '../hooks/useMppPayment'
import { MessageBubble } from './MessageBubble'
import { DataCard } from './DataCard'

interface ChatWindowProps {
  pendingQuery?: string
  onQueryConsumed: () => void
  onWalletDetected: (addr: string) => void
  mppFetch: MppFetch
  isReady: boolean
  setupError: string | null
}

const ETH_ADDRESS_RE = /0x[0-9a-fA-F]{40}/g

export function ChatWindow({ pendingQuery, onQueryConsumed, onWalletDetected, mppFetch, isReady, setupError }: ChatWindowProps) {
  const { messages, isLoading, sendMessage, stopStreaming, clearMessages } = useChat(mppFetch, isReady)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Consume pending queries from the sidebar
  useEffect(() => {
    if (pendingQuery) {
      setInput(pendingQuery)
      onQueryConsumed()
      inputRef.current?.focus()
    }
  }, [pendingQuery, onQueryConsumed])

  // Detect wallet addresses in user messages to update sidebar
  useEffect(() => {
    const last = messages.findLast((m) => m.role === 'user')
    if (!last) return
    const matches = last.content.match(ETH_ADDRESS_RE)
    if (matches) onWalletDetected(matches[0])
  }, [messages, onWalletDetected])

  const handleSend = () => {
    if (!input.trim() || !isReady) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] font-mono text-terminal-muted">analyst@tempo ~</span>
        </div>

        <div className="flex items-center gap-3">
          {/* MPP status indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${setupError ? 'bg-terminal-red' : isReady ? 'bg-terminal-green' : 'bg-terminal-muted/40 animate-pulse'}`} />
            <span className={`text-[10px] font-mono uppercase tracking-widest ${setupError ? 'text-terminal-red/80' : 'text-terminal-muted/60'}`}>
              {setupError ? 'Wallet error' : isReady ? 'MPP ready' : 'Connecting…'}
            </span>
          </div>

          <span className="text-[10px] font-mono text-terminal-muted/50 uppercase tracking-widest">
            {messages.length} messages
          </span>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-[10px] font-mono text-terminal-muted hover:text-terminal-red transition-colors"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-16">
            <div className="font-display text-3xl font-bold text-terminal-green tracking-tight">
              On-Chain Analyst
            </div>
            <p className="text-sm font-mono text-terminal-muted max-w-md leading-relaxed">
              Ask me to analyze any Ethereum wallet for risk, portfolio composition,
              whale activity, or suspicious patterns. I'll pull live data from Alchemy
              to give you a forensic breakdown.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {[
                { label: 'ETH Wallet', value: 'Analysis', sub: 'Balances + NFTs' },
                { label: 'Risk Score', value: '0–100', sub: 'Pattern detection' },
                { label: 'Alchemy', value: 'Live', sub: 'On-chain queries' },
                { label: 'Payments', value: 'MPP', sub: 'Your Tempo wallet' },
              ].map((c) => (
                <DataCard key={c.label} label={c.label} value={c.value} sub={c.sub} />
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-terminal-muted/50">
              <div className="w-1.5 h-1.5 rounded-full bg-terminal-green/40" />
              Powered by Anthropic Claude + Alchemy
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={setupError ? `Wallet error: ${setupError}` : isReady ? 'Ask about a wallet… e.g. \'Analyze 0x… for risk\'' : 'Connecting wallet…'}
              disabled={!isReady || !!setupError}
              rows={1}
              className="
                w-full bg-[var(--bg)] border border-[var(--border-2)] rounded-lg
                px-4 py-3 pr-12 text-sm font-mono text-terminal-text
                placeholder-terminal-muted/40
                focus:outline-none focus:border-terminal-green/40 focus:ring-1 focus:ring-terminal-green/15
                resize-none min-h-[46px] max-h-[120px] overflow-y-auto
                transition-colors leading-relaxed
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }}
            />
            <div className="absolute right-3 bottom-3 text-[10px] font-mono text-terminal-muted/30">
              ↵
            </div>
          </div>

          {isLoading ? (
            <button
              onClick={stopStreaming}
              className="
                px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider
                bg-terminal-red/10 border border-terminal-red/30 text-terminal-red
                rounded-lg hover:bg-terminal-red/20 transition-all shrink-0
              "
            >
              ■ Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isReady || !!setupError}
              className="
                px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider
                bg-terminal-green/10 border border-terminal-green/30 text-terminal-green
                rounded-lg hover:bg-terminal-green/20 hover:border-terminal-green/60
                transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed
              "
            >
              Send →
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] font-mono text-terminal-muted/40">
            Paid from your Tempo wallet · MPP session · $0.01 per request
          </p>
        </div>
      </div>
    </div>
  )
}
