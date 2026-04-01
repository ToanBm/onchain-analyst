import { Mppx, tempo } from 'mppx/client'
import { useEffect, useRef, useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { keccak256, serializeTransaction, toHex } from 'viem'
import { toAccount } from 'viem/accounts'

export type MppFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function useMppPayment() {
  const { createWallet } = usePrivy()
  const { wallets } = useWallets()
  const mppxRef = useRef<{ fetch: MppFetch; close?: () => Promise<unknown> } | null>(null)
  const initialisedRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  useEffect(() => {
    async function setup() {
      if (initialisedRef.current) return

      let embedded = wallets.find((w) => w.walletClientType === 'privy')

      // If no embedded wallet exists yet, create one
      if (!embedded) {
        try {
          await createWallet()
          // After creation, it may take a render cycle to appear in wallets —
          // the effect will re-run when wallets updates
        } catch {
          // createWallet may throw if a wallet already exists or is pending —
          // wait for the next wallets update
        }
        return
      }

      try {
        initialisedRef.current = true

        const provider = await embedded.getEthereumProvider()

        const account = toAccount({
          address: embedded.address as `0x${string}`,

          async signMessage({ message }) {
            const data = typeof message === 'string' ? toHex(message) : message.raw
            return provider.request({
              method: 'personal_sign',
              params: [data, embedded.address],
            }) as Promise<`0x${string}`>
          },

          async signTransaction(transaction, options) {
            const serializer = options?.serializer ?? serializeTransaction
            const unsigned = await Promise.resolve(serializer(transaction))
            const hash = keccak256(unsigned as `0x${string}`)
            const signature = await provider.request({
              method: 'secp256k1_sign',
              params: [hash],
            }) as `0x${string}`
            const { SignatureEnvelope } = await import('ox/tempo')
            const envelope = SignatureEnvelope.from(signature)
            return (await Promise.resolve(serializer(transaction, envelope as never))) as `0x${string}`
          },

          async signTypedData(typedData) {
            const { hashTypedData } = await import('viem')
            const hash = hashTypedData(typedData as Parameters<typeof hashTypedData>[0])
            return provider.request({
              method: 'secp256k1_sign',
              params: [hash],
            }) as Promise<`0x${string}`>
          },
        })

        mppxRef.current = Mppx.create({
          polyfill: false,
          methods: [tempo({ account, maxDeposit: '0.1' })],
        })

        setWalletAddress(embedded.address)
        setIsReady(true)
      } catch (err) {
        initialisedRef.current = false // allow retry
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[useMppPayment] setup failed:', msg)
        setSetupError(msg)
      }
    }

    setup()
  }, [wallets, createWallet])

  // Best-effort: close channel on page unload → server settles → refund remainder
  useEffect(() => {
    const handleUnload = () => { mppxRef.current?.close?.() }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  const mppFetch: MppFetch = (input, init) =>
    mppxRef.current
      ? mppxRef.current.fetch(input, init)
      : globalThis.fetch(input, init)

  return { mppFetch, isReady, setupError, walletAddress }
}
