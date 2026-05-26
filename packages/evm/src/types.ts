import type { Intent, ExecutionPlan, SignedTransaction, Receipt, SimulationResult } from '@runtimee/core'

export interface ExecutionProvider {
  simulate(intent: Intent): Promise<SimulationResult>
  sign(executionPlan: ExecutionPlan): Promise<SignedTransaction>
  broadcast(signed: SignedTransaction): Promise<`0x${string}`>
  wait(txHash: `0x${string}`, confirmations?: number): Promise<Receipt>
}

export interface Signer {
  signTransaction(tx: {
    to: `0x${string}`
    data: `0x${string}`
    value: bigint
    chainId: number
    gasLimit: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    nonce: number
  }): Promise<`0x${string}`>
}

export interface Broadcaster {
  sendRawTransaction(signedTx: `0x${string}`): Promise<`0x${string}`>
  getTransactionReceipt(txHash: `0x${string}`): Promise<{
    status: 'success' | 'reverted'
    blockNumber: bigint
    gasUsed: bigint
    effectiveGasPrice: bigint
  } | null>
  getTransactionCount(address: `0x${string}`): Promise<number>
  estimateGas(tx: { to: `0x${string}`; data: `0x${string}`; value: bigint; from: `0x${string}` }): Promise<bigint>
}

export const USDC_DECIMALS = 6
export const USDC_ADDRESS_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

export const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const
