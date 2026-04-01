import { useCallback, useRef, useState } from 'react'
import type { MppFetch } from './useMppPayment'

export interface ToolStep {
  name: string
  done: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  toolSteps?: ToolStep[]
  error?: string
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Stream SSE from /api/chat (mppFetch handles 402 transparently) ───────────

const RETRY_DELAY_MS = 3000
const MAX_402_RETRIES = 3

async function* streamFromBackend(
  message: string,
  history: Array<{ role: string; content: string }>,
  fetchFn: MppFetch,
): AsyncGenerator<{ type: 'text'; text: string } | { type: 'tool_start'; name: string } | { type: 'tool_done'; name: string } | { type: 'error'; error: string }> {
  let resp: Response | null = null

  for (let attempt = 0; attempt <= MAX_402_RETRIES; attempt++) {
    resp = await fetchFn('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, history }),
    })

    if (resp.status !== 402) break

    // 402 = payment channel opening (mppx depositing on-chain, needs confirmation)
    if (attempt < MAX_402_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }
  }

  if (!resp || !resp.ok || !resp.body) {
    const msg = resp?.status === 402
      ? 'Payment channel unavailable — please add USDC.e to your Tempo wallet'
      : `Server error ${resp?.status ?? 'unknown'}`
    yield { type: 'error', error: msg }
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    let currentEvent: string | null = null
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
        continue
      }
      if (!line.startsWith('data: ')) { currentEvent = null; continue }
      const raw = line.slice(6)
      if (raw === '[DONE]') return
      if (currentEvent === 'tool_start') {
        yield { type: 'tool_start', name: raw }
        currentEvent = null
        continue
      }
      if (currentEvent === 'tool_done') {
        yield { type: 'tool_done', name: raw }
        currentEvent = null
        continue
      }
      if (currentEvent === 'error') {
        try { const parsed = JSON.parse(raw); yield { type: 'error', error: parsed.error ?? raw }; return } catch { yield { type: 'error', error: raw }; return }
      }
      currentEvent = null
      try {
        const parsed = JSON.parse(raw)
        if (parsed.error) { yield { type: 'error', error: parsed.error }; return }
      } catch {
        // Plain text chunk
        yield { type: 'text', text: raw.replace(/\\n/g, '\n') }
      }
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(mppFetch: MppFetch, isReady: boolean) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<boolean>(false)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !isReady) return

    const userMsg: Message = { id: uid(), role: 'user', content: text }
    const assistantId = uid()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsLoading(true)
    abortRef.current = false

    const history = messages
      .filter((m) => !m.streaming && !m.error)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const toolSteps: ToolStep[] = []
    let accumulated = ''

    const source = streamFromBackend(text, history, mppFetch)

    try {
      for await (const chunk of source) {
        if (abortRef.current) break

        if (chunk.type === 'tool_start') {
          toolSteps.push({ name: chunk.name, done: false })
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, toolSteps: [...toolSteps] } : m)),
          )
        } else if (chunk.type === 'tool_done') {
          const idx = [...toolSteps].reverse().findIndex((s) => s.name === chunk.name && !s.done)
          if (idx !== -1) toolSteps[toolSteps.length - 1 - idx].done = true
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, toolSteps: [...toolSteps] } : m)),
          )
        } else if (chunk.type === 'text') {
          accumulated += chunk.text
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
          )
        } else if (chunk.type === 'error') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false, error: chunk.error } : m,
            ),
          )
          return
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, toolSteps } : m)),
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, error: msg } : m)),
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isReady, messages, mppFetch])

  const stopStreaming = useCallback(() => {
    abortRef.current = true
    setIsLoading(false)
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, stopStreaming, clearMessages }
}
