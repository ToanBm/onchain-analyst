import { useEffect, useRef, useState } from 'react'
import type { Message } from '../hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { DataCard } from './DataCard'

interface ChatWindowProps {
  pendingQuery?: string
  onQueryConsumed: () => void
  onWalletDetected: (addr: string) => void
  isReady: boolean
  setupError: string | null
  messages: Message[]
  isLoading: boolean
  sendMessage: (text: string) => void
  stopStreaming: () => void
}

const ETH_ADDRESS_RE = /0x[0-9a-fA-F]{40}/g

export function ChatWindow({ pendingQuery, onQueryConsumed, onWalletDetected, isReady, setupError, messages, isLoading, sendMessage, stopStreaming }: ChatWindowProps) {
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
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-16">
            <div className="font-display text-3xl font-bold text-[var(--green)] tracking-tight">
              On-Chain Analyst
            </div>
            <p className="text-sm font-mono text-[var(--muted)] max-w-md leading-relaxed">
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
            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted-a50)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--green-a40)]" />
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
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 md:px-5 pt-4 input-safe-area">
        <div className="relative">
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
              px-4 py-3 pr-12 text-sm font-mono text-[var(--text)]
              placeholder-[var(--muted-a40)]
              focus:outline-none focus:border-[var(--green-a40)] focus:ring-1 focus:ring-[var(--green-a15)]
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

          {/* Send / Stop button — inside the input */}
          {isLoading ? (
            <button
              onClick={stopStreaming}
              className="
                absolute right-2.5 bottom-2.5
                p-1.5 rounded-md
                bg-[var(--red-a10)] border border-[var(--red-a30)] text-[var(--red)]
                hover:bg-[var(--red-a20)] transition-all
              "
              title="Stop"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isReady || !!setupError}
              className="
                absolute right-2.5 bottom-2.5
                p-1.5 rounded-md transition-all
                bg-[var(--green-a10)] border border-[var(--green-a30)] text-[var(--green)]
                hover:bg-[var(--green-a20)] hover:border-[var(--green-a60)]
                disabled:opacity-30 disabled:cursor-not-allowed
              "
              title="Send"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] font-mono text-[var(--muted-a40)]">
            Paid from your Tempo wallet · MPP session · $0.01 per request
          </p>
        </div>
      </div>
    </div>
  )
}
