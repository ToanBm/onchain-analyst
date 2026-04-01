/**
 * Server-side analyst agent (runs inside api/chat.ts Vercel function).
 *
 * Architecture: LLM coordinator + tool-calling loop
 * - Claude (direct API key) analyzes the user question and decides which data is needed
 * - Claude returns tool_use blocks → app executes those against MPP services
 * - Results returned as tool_result → Claude reasons further or finishes
 * - MPP payments per request:
 *     User → App          (session, existing, handled in api/chat.ts)
 *     App  → Alchemy      (charge, per tool call, via mppxClient.fetch)
 *     App  → Parallel     (session, per tool call, via mppxClient.fetch — stub until endpoint confirmed)
 *     App  → fal.ai       (charge, per tool call, via mppxClient.fetch)
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ALCHEMY_MPP_BASE = 'https://mpp.alchemy.com'
const ALCHEMY_ETH_RPC = `${ALCHEMY_MPP_BASE}/eth-mainnet/v2`
const ALCHEMY_PORTFOLIO_URL = `${ALCHEMY_MPP_BASE}/data/v1/assets/tokens/by-address`
const ALCHEMY_PRICE_URL = `${ALCHEMY_MPP_BASE}/data/v1/prices/by-symbol`
const FAL_MPP_URL = 'https://fal.mpp.tempo.xyz/fal-ai/flux/dev'
// PARALLEL_MPP_URL: not yet publicly documented — tool returns stub error until confirmed

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

// ─── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'alchemy_get_token_balances',
    description: 'Get token portfolio with USD prices for an Ethereum wallet via Alchemy MPP. Use this when the user asks about wallet holdings, balances, net worth, or portfolio composition.',
    input_schema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Ethereum wallet address (0x...)' },
      },
      required: ['wallet'],
    },
  },
  {
    name: 'alchemy_get_asset_transfers',
    description: 'Get recent asset transfers for an Ethereum wallet via Alchemy MPP. Use this when the user asks about transaction history, recent activity, incoming/outgoing transfers, or risk patterns.',
    input_schema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Ethereum wallet address (0x...)' },
        direction: {
          type: 'string',
          enum: ['in', 'out', 'both'],
          description: 'Which transfer direction to fetch',
        },
        maxCount: {
          type: 'number',
          description: 'Maximum transfers to return (default 50, max 100)',
        },
      },
      required: ['wallet', 'direction'],
    },
  },
  {
    name: 'alchemy_get_token_price',
    description: 'Get current USD price for a token symbol via Alchemy MPP. Use this when the user asks about price, market data, or wants to value a specific token.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Token ticker symbol, e.g. ETH, BTC, USDC, UNI' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'parallel_search',
    description: 'Web search for crypto news, project information, or contextual background via Parallel MPP. Use this when the user asks about news, events, project details, or needs context beyond on-chain data.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fal_generate_chart',
    description: 'Generate a chart or data visualization image via fal.ai MPP. Use this when the user asks for a visual representation of data.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed description of the chart to generate' },
      },
      required: ['prompt'],
    },
  },
]

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert on-chain crypto analyst with deep knowledge of \
Ethereum wallet risk analysis, DeFi patterns, and blockchain forensics.

You have access to the following tools:
- alchemy_get_token_balances: Fetch token portfolio + USD values for any wallet
- alchemy_get_asset_transfers: Fetch recent transfer history (in, out, or both)
- alchemy_get_token_price: Fetch current USD price for any token
- parallel_search: Search the web for crypto news or project context
- fal_generate_chart: Generate data visualization images

Use tools as needed to answer the user's question. You decide which tools to call — \
only call what is relevant to the question asked.

When analysing wallets:
- Assess portfolio composition: token diversity, USD values, concentration risk \
  (>80% in one token = high risk), blue-chip vs unknown tokens
- Identify risk signals: high-frequency counterparties, round-number large transfers, \
  unusual patterns
- Flag suspicious activity: wash trading signs, bot-like behaviour, rapid in-and-out
- Provide a risk rating using the EXACT tag: [RISK: LOW], [RISK: MEDIUM], \
  [RISK: HIGH], or [RISK: CRITICAL]

Response format for wallet analyses:
1. One-sentence summary
2. [RISK: X] rating with brief justification
3. Key findings (numbered, data-cited)
4. Recommendations

For general questions, answer directly and concisely.

Always cite specific numbers and data from tool results. \
If a tool returns an error field, tell the user which data source failed. \
Never fabricate balances, prices, or transaction data.`

// ─── Alchemy helpers ───────────────────────────────────────────────────────────

async function alchemyPost(
  url: string,
  body: unknown,
  siweToken: string,
  fetchFn: FetchFn,
): Promise<unknown> {
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-token': `SIWE ${siweToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return { error: `Alchemy HTTP ${resp.status}: ${text.slice(0, 200)}` }
  }

  return resp.json()
}

// ─── Tool executors ────────────────────────────────────────────────────────────

async function execAlchemyGetTokenBalances(
  input: Record<string, unknown>,
  siweToken: string,
  fetchFn: FetchFn,
): Promise<unknown> {
  return alchemyPost(
    ALCHEMY_PORTFOLIO_URL,
    {
      addresses: [{ address: input.wallet, networks: ['eth-mainnet'] }],
      withMetadata: true,
      withPrices: true,
    },
    siweToken,
    fetchFn,
  )
}

async function execAlchemyGetAssetTransfers(
  input: Record<string, unknown>,
  siweToken: string,
  fetchFn: FetchFn,
): Promise<unknown> {
  const direction = input.direction as string
  const maxCount = `0x${((input.maxCount as number) ?? 50).toString(16)}`
  const category = ['external', 'erc20', 'erc721', 'erc1155']
  const base = { category, withMetadata: true, order: 'desc', maxCount }

  if (direction === 'both') {
    const [incoming, outgoing] = await Promise.all([
      alchemyPost(ALCHEMY_ETH_RPC, {
        jsonrpc: '2.0', id: 1, method: 'alchemy_getAssetTransfers',
        params: [{ toAddress: input.wallet, ...base }],
      }, siweToken, fetchFn),
      alchemyPost(ALCHEMY_ETH_RPC, {
        jsonrpc: '2.0', id: 2, method: 'alchemy_getAssetTransfers',
        params: [{ fromAddress: input.wallet, ...base }],
      }, siweToken, fetchFn),
    ])
    return { in: incoming, out: outgoing }
  }

  return alchemyPost(ALCHEMY_ETH_RPC, {
    jsonrpc: '2.0', id: 1, method: 'alchemy_getAssetTransfers',
    params: [{ [direction === 'in' ? 'toAddress' : 'fromAddress']: input.wallet, ...base }],
  }, siweToken, fetchFn)
}

async function execAlchemyGetTokenPrice(
  input: Record<string, unknown>,
  siweToken: string,
  fetchFn: FetchFn,
): Promise<unknown> {
  return alchemyPost(
    ALCHEMY_PRICE_URL,
    { symbols: [input.symbol] },
    siweToken,
    fetchFn,
  )
}

async function execParallelSearch(
  _input: Record<string, unknown>,
  _fetchFn: FetchFn,
): Promise<unknown> {
  // Parallel MPP endpoint not yet publicly documented.
  // Return stub until the endpoint is confirmed.
  return { error: 'Parallel search MPP endpoint not yet configured — coming soon.' }
}

async function execFalGenerateChart(
  input: Record<string, unknown>,
  fetchFn: FetchFn,
): Promise<unknown> {
  const resp = await fetchFn(FAL_MPP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: input.prompt }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return { error: `fal.ai HTTP ${resp.status}: ${text.slice(0, 200)}` }
  }

  return resp.json()
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  siweToken: string,
  fetchFn: FetchFn,
): Promise<unknown> {
  switch (name) {
    case 'alchemy_get_token_balances':
      return execAlchemyGetTokenBalances(input, siweToken, fetchFn)
    case 'alchemy_get_asset_transfers':
      return execAlchemyGetAssetTransfers(input, siweToken, fetchFn)
    case 'alchemy_get_token_price':
      return execAlchemyGetTokenPrice(input, siweToken, fetchFn)
    case 'parallel_search':
      return execParallelSearch(input, fetchFn)
    case 'fal_generate_chart':
      return execFalGenerateChart(input, fetchFn)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ─── Anthropic message types ───────────────────────────────────────────────────

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

type AnthropicMessage = {
  role: string
  content: string | AnthropicContentBlock[]
}

// ─── Agent ─────────────────────────────────────────────────────────────────────

export type AgentChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_done'; name: string }
  | { type: 'error'; error: string }

export async function* runAgent(
  message: string,
  history: Array<{ role: string; content: string }>,
  options: { fetch?: FetchFn; siweToken?: string; anthropicApiKey?: string } = {},
): AsyncGenerator<AgentChunk> {
  const fetchFn = options.fetch ?? globalThis.fetch
  const siweToken = options.siweToken ?? ''
  const anthropicApiKey = options.anthropicApiKey ?? ''

  if (!anthropicApiKey) {
    yield { type: 'error', error: 'ANTHROPIC_API_KEY not configured' }
    return
  }

  const messages: AnthropicMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  // Tool-calling loop: call Claude → execute tools → repeat until end_turn
  while (true) {
    const resp = await globalThis.fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      }),
    })

    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      yield { type: 'error', error: `Anthropic error ${resp.status}: ${err.slice(0, 200)}` }
      return
    }

    const data = await resp.json() as { stop_reason: string; content: AnthropicContentBlock[] }

    // Yield any text blocks from this turn
    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        yield { type: 'text', text: block.text }
      }
    }

    if (data.stop_reason === 'end_turn') break

    if (data.stop_reason === 'tool_use') {
      // Append assistant turn (includes tool_use blocks)
      messages.push({ role: 'assistant', content: data.content })

      // Execute each tool call and collect results
      const toolResults: AnthropicContentBlock[] = []
      for (const block of data.content) {
        if (block.type !== 'tool_use') continue

        yield { type: 'tool_start', name: block.name }
        let result: unknown
        try {
          result = await executeTool(block.name, block.input, siweToken, fetchFn)
        } catch (e) {
          result = { error: String(e) }
        }
        yield { type: 'tool_done', name: block.name }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
        })
      }

      // Append tool results as user turn and loop
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // Unexpected stop_reason
    break
  }
}
