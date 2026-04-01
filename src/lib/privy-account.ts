/**
 * Creates a viem Account backed by a Privy server wallet.
 * Signs Tempo transactions via secp256k1_sign + ox/tempo SignatureEnvelope.
 *
 * Based on: https://docs.privy.io/recipes/agent-integrations/mpp
 */
import { PrivyClient } from '@privy-io/node'
import { keccak256 } from 'viem'
import { toAccount } from 'viem/accounts'

export function createPrivyAccount(
  privy: PrivyClient,
  walletId: string,
  address: `0x${string}`,
) {
  async function signHash(hash: `0x${string}`): Promise<`0x${string}`> {
    const result = await privy.wallets().ethereum().signSecp256k1(walletId, {
      params: { hash },
    })
    return result.signature as `0x${string}`
  }

  return toAccount({
    address,

    async signMessage({ message }) {
      const result = await privy.wallets().ethereum().signMessage(walletId, {
        message: typeof message === 'string' ? message : message.raw,
      })
      return result.signature as `0x${string}`
    },

    async signTransaction(transaction, options) {
      const serializer = options?.serializer
      if (!serializer) throw new Error('Tempo serializer required')

      const unsigned = await serializer(transaction)
      const hash = keccak256(unsigned as `0x${string}`)
      const signature = await signHash(hash)

      // Use ox/tempo SignatureEnvelope for Tempo transaction type
      const { SignatureEnvelope } = await import('ox/tempo')
      const envelope = SignatureEnvelope.from(signature)
      return (await serializer(transaction, envelope as never)) as `0x${string}`
    },

    async signTypedData(typedData) {
      // Privy API requires params.typed_data with snake_case primary_type.
      // BigInt values in message are serialized as decimal strings by the
      // api/chat.ts BigInt.prototype.toJSON polyfill before Privy sends JSON.
      const result = await privy.wallets().ethereum().signTypedData(walletId, {
        params: {
          typed_data: {
            domain: typedData.domain as Record<string, unknown>,
            message: typedData.message as Record<string, unknown>,
            primary_type: typedData.primaryType as string,
            types: typedData.types as Record<string, Array<{ name: string; type: string }>>,
          },
        },
      })
      return result.signature as `0x${string}`
    },
  })
}
