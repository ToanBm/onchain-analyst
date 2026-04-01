/**
 * Vercel serverless function — /api/chat
 *
 * Full MPP chain:
 *   Browser (user's Privy embedded wallet)
 *     → [MPP session] → this endpoint (operator receives payment)
 *     → [MPP session] → Anthropic MPP proxy
 *     → [MPP session] → Alchemy MPP gateway
 *
 * Credentials live in Vercel environment variables (never exposed to browser).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrivyClient } from '@privy-io/node'
import { Mppx, tempo } from 'mppx/client'
import { Mppx as MppxServer, Store, tempo as tempoServer } from 'mppx/server'
import { createSiweMessage, generateSiweNonce } from 'viem/siwe'
import { base } from 'viem/chains'
import { createPrivyAccount } from '../src/lib/privy-account.js'
import { runAgent } from '../src/lib/agent.js'

// ─── Cold-start initialisation ────────────────────────────────────────────────

const privy = new PrivyClient({
  appID: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
})

const account = createPrivyAccount(
  privy,
  process.env.PRIVY_WALLET_ID!,
  process.env.PRIVY_WALLET_ADDRESS! as `0x${string}`,
)

// Client: pays Alchemy, Parallel, and fal.ai via MPP (Anthropic uses direct API key)
const mppxClient = Mppx.create({ polyfill: false, methods: [tempo({ account, maxDeposit: '0.1' })] })

// Server: receives payments FROM users via MPP session
// Upstash Redis persists channel state across Vercel cold starts — no re-challenge needed.
// Uses Store.cloudflare() (which handles BigInt via ox's Json) backed by Upstash REST HTTP.
// Store.upstash() is NOT used because it skips serialization — channel State has bigint
// fields (deposit, spent, highestVoucherAmount) that JSON.stringify corrupts to strings.
function makeUpstashStore(url: string, token: string) {
  const auth = { Authorization: `Bearer ${token}` }
  const jsonHeaders = { ...auth, 'Content-Type': 'application/json' }
  return Store.cloudflare({
    async get(key: string) {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: auth })
      if (!r.ok) {
        console.error(`[upstash] GET failed ${r.status}`)
        return null
      }
      const j = await r.json() as { result: string | null }
      console.log(`[upstash] GET ${key} → ${j.result == null ? 'null' : 'found'}`)
      return j.result ?? null
    },
    async put(key: string, value: string) {
      // value is already Json.stringify'd by Store.cloudflare — pass directly to Upstash
      // Use /pipeline endpoint (unambiguously documented Upstash REST format)
      const r = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify([['SET', key, value]]),
      })
      if (!r.ok) console.error(`[upstash] SET failed ${r.status}`)
      else console.log(`[upstash] SET ${key} → OK`)
    },
    async delete(key: string) {
      await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify([['DEL', key]]),
      })
    },
  })
}

const channelStore = process.env.UPSTASH_REDIS_URL
  ? makeUpstashStore(process.env.UPSTASH_REDIS_URL, process.env.UPSTASH_REDIS_TOKEN!)
  : Store.memory()

const mppxServer = MppxServer.create({
  secretKey: process.env.MPP_SECRET_KEY!,
  methods: [
    tempoServer.session({
      recipient: process.env.PRIVY_WALLET_ADDRESS! as `0x${string}`,
      store: channelStore,
      channelStateTtl: 30 * 60 * 1000, // 30 min — avoid per-voucher RPC calls
      suggestedDeposit: '0.04',          // client deposits 0.04 USDC.e (gas ~0.031, total ~0.071)
    }),
  ],
})

// ─── Alchemy SIWE token ────────────────────────────────────────────────────────
// Cached per cold-start; regenerated 10 min before the 1-hour expiry.

let siweCache: { token: string; expiresAt: number } | null = null

async function getAlchemySiweToken(): Promise<string> {
  if (siweCache && Date.now() < siweCache.expiresAt) return siweCache.token

  const walletAddress = process.env.PRIVY_WALLET_ADDRESS! as `0x${string}`
  const expirationTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  const message = createSiweMessage({
    address: walletAddress,
    chainId: base.id,
    domain: 'mpp.alchemy.com',
    nonce: generateSiweNonce(),
    uri: 'https://mpp.alchemy.com',
    version: '1',
    statement: 'Sign in to Alchemy Gateway',
    expirationTime,
  })

  const signature = await account.signMessage({ message })
  const token = `${Buffer.from(message).toString('base64')}.${signature}`

  // Cache until 10 min before the token expires
  siweCache = { token, expiresAt: expirationTime.getTime() - 10 * 60 * 1000 }
  return token
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // ── MPP payment gate ───────────────────────────────────────────────────────
  // Convert Vercel request to Fetch Request for mppx server verification.
  const host = (req.headers['x-forwarded-host'] ?? req.headers['host'] ?? 'localhost') as string
  const fetchReq = new Request(`https://${host}/api/chat`, {
    method: 'POST',
    headers: req.headers as HeadersInit,
    body: JSON.stringify(req.body),
  })

  const payment = await mppxServer.session({ amount: '0.001', unitType: 'request' })(fetchReq)

  if (payment.status === 402) {
    const challenge = payment.challenge
    const body = await challenge.clone().text()
    console.log('[mppx] 402 challenge body:', body)
    res.status(402)
    challenge.headers.forEach((value: string, key: string) => res.setHeader(key, value))
    res.end(body)
    return
  }

  // Attach payment receipt to response headers
  const receiptRes = payment.withReceipt(new Response(null))
  const receiptHeader = receiptRes.headers.get('Payment-Receipt')

  // ── SIWE token for Alchemy ─────────────────────────────────────────────────
  const { message, history = [] } = req.body as {
    message: string
    history: Array<{ role: string; content: string }>
  }

  let siweToken: string
  try {
    siweToken = await getAlchemySiweToken()
  } catch (err) {
    console.error('[api/chat] SIWE token generation failed:', err)
    res.status(500).json({ error: `SIWE token failed: ${String(err)}` })
    return
  }

  // ── SSE stream ────────────────────────────────────────────────────────────
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    ...(receiptHeader ? { 'Payment-Receipt': receiptHeader } : {}),
  })

  try {
    for await (const chunk of runAgent(message, history, { fetch: mppxClient.fetch, siweToken, anthropicApiKey: process.env.ANTHROPIC_API_KEY! })) {
      if (chunk.type === 'text') {
        res.write(`data: ${chunk.text.replace(/\n/g, '\\n')}\n\n`)
      } else if (chunk.type === 'tool_start') {
        res.write(`event: tool_start\ndata: ${chunk.name}\n\n`)
      } else if (chunk.type === 'tool_done') {
        res.write(`event: tool_done\ndata: ${chunk.name}\n\n`)
      } else if (chunk.type === 'error') {
        res.write(`event: error\ndata: ${JSON.stringify({ error: chunk.error })}\n\n`)
      }
    }
  } catch (err) {
    console.error('[api/chat] runAgent threw:', err)
    res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`)
  }

  res.write('event: done\ndata: [DONE]\n\n')
  res.end()
}
