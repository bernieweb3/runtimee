import { encodeFunctionData } from 'viem'
import { USDC_ADDRESS_BASE, USDC_ABI } from './types.js'

export interface BuildTxParams {
  to: `0x${string}`
  from: `0x${string}`
  amount: bigint
  chainId: number
  nonce: number
  gasLimit: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

export interface EvmTransaction {
  to: `0x${string}`
  data: `0x${string}`
  value: bigint
  chainId: number
  nonce: number
  gasLimit: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

export function encodeUsdcTransfer(
  recipient: `0x${string}`,
  amount: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [recipient, amount],
  })
}

export function buildEvmTransaction(params: BuildTxParams): EvmTransaction {
  const data = encodeUsdcTransfer(params.to, params.amount)
  return {
    to: USDC_ADDRESS_BASE,
    data,
    value: 0n,
    chainId: params.chainId,
    nonce: params.nonce,
    gasLimit: params.gasLimit,
    maxFeePerGas: params.maxFeePerGas,
    maxPriorityFeePerGas: params.maxPriorityFeePerGas,
  }
}
