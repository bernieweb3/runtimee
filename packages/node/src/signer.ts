import type { Signer } from '@runtimee/evm'
import { privateKeyToAccount } from 'viem/accounts'
import type { TransactionSerializable } from 'viem'

export function createLocalSigner(privateKey: `0x${string}`): Signer {
  const account = privateKeyToAccount(privateKey)

  return {
    async signTransaction(tx) {
      const serializable: TransactionSerializable = {
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId,
        gas: tx.gasLimit,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        nonce: tx.nonce,
        type: 'eip1559',
      }
      const signed = await account.signTransaction(serializable)
      return signed as `0x${string}`
    },
  }
}

export interface KMSConfig {
  region: string
  keyId: string
  accessKeyId: string
  secretAccessKey: string
}

export function createKMSSigner(config: KMSConfig): Signer {
  throw new Error(
    'AWS KMS signer not yet implemented. Use createLocalSigner for development.'
  )
}
