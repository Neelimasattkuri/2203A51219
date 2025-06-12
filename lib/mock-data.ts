export function mockStockData(symbol: string, minutes: number) {
  const basePrice = getBasePrice(symbol)
  const data = []
  const now = new Date()

  for (let i = minutes - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60000)
    const volatility = getVolatility(symbol)
    const trend = getTrend(symbol)

    // Generate price with some randomness and trend
    const randomFactor = (Math.random() - 0.5) * volatility
    const trendFactor = (trend * (minutes - i)) / minutes
    const price = basePrice + randomFactor + trendFactor

    data.push({
      timestamp: timestamp.toISOString(),
      price: Math.max(price, 1), // Ensure price is positive
      time: timestamp.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
    })
  }

  return data
}

function getBasePrice(symbol: string): number {
  const basePrices: { [key: string]: number } = {
    AAPL: 175,
    GOOGL: 140,
    MSFT: 380,
    AMZN: 145,
    TSLA: 250,
    META: 320,
    NVDA: 480,
    NFLX: 450,
  }
  return basePrices[symbol] || 100
}

function getVolatility(symbol: string): number {
  const volatilities: { [key: string]: number } = {
    AAPL: 3,
    GOOGL: 4,
    MSFT: 5,
    AMZN: 6,
    TSLA: 15,
    META: 8,
    NVDA: 12,
    NFLX: 10,
  }
  return volatilities[symbol] || 5
}

function getTrend(symbol: string): number {
  const trends: { [key: string]: number } = {
    AAPL: 2,
    GOOGL: -1,
    MSFT: 3,
    AMZN: 1,
    TSLA: -5,
    META: 4,
    NVDA: 8,
    NFLX: -2,
  }
  return trends[symbol] || 0
}
