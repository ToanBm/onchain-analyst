// JSON.stringify doesn't support BigInt by default; mppx uses BigInt for
// on-chain amounts. This polyfill serializes them as decimal strings.
;(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString()
}

import { PrivyProvider } from '@privy-io/react-auth'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/terminal.css'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string

if (!PRIVY_APP_ID) {
  throw new Error('VITE_PRIVY_APP_ID is not set. Copy .env.example → .env and fill in your Privy App ID.')
}

// Tempo mainnet — chain ID 4217
const tempoMainnet = {
  id: 4217,
  name: 'Tempo',
  network: 'tempo',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.tempo.xyz'] },
    public: { http: ['https://rpc.tempo.xyz'] },
  },
} as const

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          noPromptOnSignature: true, // auto-sign MPP payments silently
        },
        appearance: {
          theme: 'dark',
          accentColor: '#00ff9d',
        },
        supportedChains: [tempoMainnet],
        externalWallets: {
          coinbaseWallet: { connectionOptions: 'eoaOnly' },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
