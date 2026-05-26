export function estimateGasWithBuffer(estimatedGas: bigint): bigint {
  if (estimatedGas === 0n) return 0n
  // ceil(estimatedGas * 1.2) = ceil(estimatedGas * 6 / 5)
  return (estimatedGas * 6n + 4n) / 5n
}
