export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0
  }

  const n = x.length
  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let sumXSquared = 0
  let sumYSquared = 0

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - meanX
    const yDiff = y[i] - meanY

    numerator += xDiff * yDiff
    sumXSquared += xDiff * xDiff
    sumYSquared += yDiff * yDiff
  }

  const denominator = Math.sqrt(sumXSquared * sumYSquared)

  if (denominator === 0) {
    return 0
  }

  return numerator / denominator
}

export function calculateStats(data: number[]) {
  if (data.length === 0) {
    return { average: 0, stdDev: 0 }
  }

  const average = data.reduce((sum, val) => sum + val, 0) / data.length

  const variance =
    data.reduce((sum, val) => {
      const diff = val - average
      return sum + diff * diff
    }, 0) /
    (data.length - 1)

  const stdDev = Math.sqrt(variance)

  return { average, stdDev }
}

export function calculateCovariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0
  }

  const n = x.length
  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

  const covariance =
    x.reduce((sum, xVal, i) => {
      return sum + (xVal - meanX) * (y[i] - meanY)
    }, 0) /
    (n - 1)

  return covariance
}
