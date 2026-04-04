import { useState } from 'react'
import { parseRiskLevel, RiskBadge } from './RiskBadge'
import type { Message } from '../hooks/useChat'
import { ProgressSteps } from './ProgressSteps'


function renderContent(text: string) {
  // Replace [RISK: X] tags with the RiskBadge component inline
  const riskLevel = parseRiskLevel(text)
  const cleaned = text.replace(/\[RISK:\s*(LOW|MEDIUM|HIGH|CRITICAL)\]/gi, '').trim()

  // Render code blocks
  const parts = cleaned.split(/(```[\s\S]*?```)/g)

  return (
    <>
      {riskLevel && (
        <div className="mb-3">
          <RiskBadge level={riskLevel.level} score={riskLevel.score} />
        </div>
      )}
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3).replace(/^\w+\n/, '')
          return (
            <pre key={i} className="code-block rounded p-3 my-2 text-xs overflow-x-auto text-[var(--green)] whitespace-pre-wrap">
              <code>{inner}</code>
            </pre>
          )
        }
        // Render newlines and bold markers
        return (
          <span key={i}>
            {part.split('\n').map((line, j) => {
              const boldLine = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
              return (
                <span key={j}>
                  <span dangerouslySetInnerHTML={{ __html: boldLine }} />
                  {j < part.split('\n').length - 1 && <br />}
                </span>
              )
            })}
          </span>
        )
      })}
    </>
  )
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end fade-up mb-4">
        <div className="max-w-[75%] bg-[var(--surface-2)] border border-[var(--border-2)] rounded-lg px-4 py-3">
          <p className="text-sm text-[var(--text)] font-mono leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start fade-up mb-4">
      <div className="max-w-[85%]">
        {/* Agent header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-sm bg-[var(--green-a20)] border border-[var(--green-a40)] flex items-center justify-center">
            <span className="text-[8px] text-[var(--green)] font-bold">AI</span>
          </div>
          <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest font-mono">Analyst</span>
        </div>

        {/* Bubble */}
        <div className="agent-bubble relative rounded-lg px-4 py-3 text-sm font-mono leading-relaxed text-[var(--text)]">
          {!message.streaming && message.content && (
            <button
              onClick={handleCopy}
              title="Copy"
              className="absolute top-2.5 right-2.5 text-[var(--muted-a40)] hover:text-[var(--green)] transition-colors"
            >
              {copied ? (
                <span className="text-[10px] font-mono text-[var(--green)]">copied!</span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
                </svg>
              )}
            </button>
          )}
          {message.error ? (
            <span className="text-[var(--red)] text-xs">⚠ {message.error}</span>
          ) : (
            <>
              {message.toolSteps && message.toolSteps.length > 0 && (
                <ProgressSteps
                  steps={message.toolSteps}
                  streaming={!!message.streaming}
                  hasContent={!!message.content}
                />
              )}
              {message.content ? (
                <>
                  {renderContent(message.content)}
                  {message.streaming && <span className="cursor-blink" />}
                </>
              ) : message.streaming && (!message.toolSteps || message.toolSteps.length === 0) && (
                <span className="flex items-center gap-2 text-[var(--muted)] text-xs">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="ml-1">Thinking…</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
