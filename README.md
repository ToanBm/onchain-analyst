# On-Chain Analyst Chatbot

> AI-powered Ethereum wallet forensics over a full MPP chain:
> user's embedded wallet pays the API endpoint, which pays Anthropic and Alchemy — no API keys exposed to the browser.

## Stack

| Layer | Technology |
|-------|-----------|
| AI | Anthropic Claude (claude-sonnet-4-6) via MPP |
| On-chain data | Alchemy Portfolio + NFT API via MPP |
| Analytics | Dune Analytics (dev/MCP only — no MPP endpoint at runtime) |
| Payments | mppx · Privy server wallet (free) or embedded wallet (paid) |
| Auth | Privy (email, Google, Twitter, wallet) |
| Frontend | React 18, Vite, Tailwind CSS |
| Serverless | Vercel (api/chat.ts — free mode) |
| State | Upstash Redis (MPP channel persistence across cold starts) |

## Payment Architecture

Every request flows through a full MPP chain — two MPP sessions, no API keys at runtime.

```
Browser (user's Privy embedded wallet)
  └─ [MPP session] → POST /api/chat   (0.001 USDC.e per request → operator)
       └─ [MPP session] → Anthropic MPP proxy
       └─ [MPP session] → Alchemy MPP gateway
```

**Leg 1 — browser → `/api/chat`**
The user's Privy embedded wallet (set up silently at login) pays the Vercel serverless function via mppx. A Tempo payment channel is opened on first request; subsequent requests deduct vouchers against the same channel deposit (`0.04 USDC.e`). Channel state is persisted in Upstash Redis so it survives Vercel cold starts.

**Leg 2 — `/api/chat` → Anthropic + Alchemy**
The operator's Privy server wallet pays both upstream services via mppx. Alchemy is authenticated with a SIWE token (generated from the server wallet, cached for 1 hour); Anthropic uses a direct API key passed to the MPP proxy.

## Quick Start

### 1. Configure

```bash
cd onchain-analyst
cp .env.example .env
# Fill in all values (see .env.example)
```

### 2. Privy setup

1. Create app at https://dashboard.privy.io
2. Enable **Embedded Wallets** → "Create on login", `noPromptOnSignature: true`
3. Add Tempo network — Chain ID: `4217`, RPC: `https://rpc.tempo.xyz`
4. Go to **Wallets** → create a **server wallet** → note the Wallet ID + address
5. Fund the server wallet with **pathUSD** at https://app.tempo.xyz

### 3. Run locally

```bash
npm install
npm run dev:full
# → http://localhost:3000 (frontend + /api/chat together)
```

Or run with plain Vite (wallet mode only — no serverless function):

```bash
npm run dev
# → http://localhost:5173
```

### 4. Deploy

```bash
vercel deploy
# Set env vars in Vercel dashboard
```

## Project Structure

```
onchain-analyst/
├── api/
│   └── chat.ts               # Vercel serverless function — free mode SSE
├── src/
│   ├── main.tsx              # PrivyProvider (chain 4217, noPromptOnSignature)
│   ├── App.tsx               # Auth gate + mode state
│   ├── lib/
│   │   ├── agent.ts          # Claude tool-use loop (browser-side, wallet mode)
│   │   └── privy-account.ts  # Privy server wallet → viem Account (used by api/chat.ts)
│   ├── hooks/
│   │   ├── useChat.ts        # Mode-aware: free → /api/chat SSE, wallet → browser agent
│   │   └── useMppPayment.ts  # Privy embedded wallet → mppx (wallet mode)
│   └── components/
│       ├── ChatWindow.tsx    # Mode toggle (Free / Wallet) in top bar
│       ├── DataCard.tsx
│       ├── MessageBubble.tsx
│       ├── ProgressSteps.tsx
│       ├── RiskBadge.tsx
│       ├── WalletBar.tsx
│       └── WalletPanel.tsx
├── vercel.json
└── .env.example
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_PRIVY_APP_ID` | frontend (browser) | Privy app ID |
| `PRIVY_APP_ID` | Vercel (server) | Privy app ID (server-side) |
| `PRIVY_APP_SECRET` | Vercel (server) | Privy app secret |
| `PRIVY_WALLET_ID` | Vercel (server) | Server wallet ID (from Privy dashboard) |
| `PRIVY_WALLET_ADDRESS` | Vercel (server) | Server wallet address |
| `MPP_SECRET_KEY` | Vercel (server) | Random 32-byte hex key for MPP channel auth |
| `ANTHROPIC_API_KEY` | Vercel (server) | Anthropic API key (free mode AI calls) |
| `UPSTASH_REDIS_URL` | Vercel (server) | Upstash Redis REST URL (optional — persists MPP state) |
| `UPSTASH_REDIS_TOKEN` | Vercel (server) | Upstash Redis REST token |

> **MPP_SECRET_KEY** can be generated with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
>
> **UPSTASH_REDIS_***: optional but recommended. Without it, MPP channel state is in-memory and lost on Vercel cold starts, causing users to see 402 errors. Create a free instance at https://upstash.com.
