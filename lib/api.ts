// Configuration for different environments
const BACKEND_URLS = ["http://localhost:5000", "http://127.0.0.1:5000", "http://0.0.0.0:5000"]

let ACTIVE_BACKEND_URL: string | null = null

export interface StockDataPoint {
  timestamp: string
  price: number
  time: string
}

export interface StockResponse {
  symbol: string
  data: StockDataPoint[]
  average: number
  count: number
  timeRange: number
  source?: string
}

export interface CorrelationResponse {
  correlations: { [key: string]: { [key: string]: number } }
  statistics: { [key: string]: { average: number; stdDev: number } }
  symbols: string[]
  timeRange: number
  source?: string
}

export interface AuthStatus {
  authenticated: boolean
  token_expires: string | null
  status: string
  error?: string
  api_endpoint?: string
}

// Mock data generators for complete offline functionality
function generateRealisticStockData(symbol: string, minutes: number): StockDataPoint[] {
  const basePrices: { [key: string]: number } = {
    AAPL: 175.5,
    GOOGL: 140.25,
    MSFT: 380.75,
    AMZN: 145.3,
    TSLA: 250.8,
    META: 320.45,
    NVDA: 480.9,
    NFLX: 450.15,
  }

  const basePrice = basePrices[symbol] || 100
  const data: StockDataPoint[] = []
  const now = new Date()

  // Generate more realistic price movements
  let currentPrice = basePrice
  const volatility = 0.02 // 2% volatility
  const trend = (Math.random() - 0.5) * 0.001 // Small trend

  for (let i = 0; i < minutes; i++) {
    const timestamp = new Date(now.getTime() - (minutes - i - 1) * 60000)

    // Random walk with trend
    const randomChange = (Math.random() - 0.5) * volatility * currentPrice
    const trendChange = trend * currentPrice
    currentPrice = Math.max(currentPrice + randomChange + trendChange, 1)

    data.push({
      timestamp: timestamp.toISOString(),
      price: Math.round(currentPrice * 100) / 100,
      time: timestamp.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
    })
  }

  return data
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0

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
  return denominator === 0 ? 0 : numerator / denominator
}

function calculateStats(data: number[]) {
  if (data.length === 0) return { average: 0, stdDev: 0 }

  const average = data.reduce((sum, val) => sum + val, 0) / data.length
  const variance = data.reduce((sum, val) => sum + (val - average) ** 2, 0) / (data.length - 1)
  const stdDev = Math.sqrt(variance)

  return { average, stdDev }
}

class ApiService {
  private backendConnected = false
  private connectionAttempted = false

  private async findWorkingBackend(): Promise<string | null> {
    if (this.connectionAttempted && ACTIVE_BACKEND_URL) {
      return ACTIVE_BACKEND_URL
    }

    this.connectionAttempted = true

    for (const url of BACKEND_URLS) {
      try {
        console.log(`Trying to connect to backend at: ${url}`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const response = await fetch(`${url}/health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          ACTIVE_BACKEND_URL = url
          this.backendConnected = true
          console.log(`✅ Connected to backend at: ${url}`)
          return url
        }
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}:`, error)
        continue
      }
    }

    this.backendConnected = false
    ACTIVE_BACKEND_URL = null
    console.log("❌ No backend connection available")
    return null
  }

  private async makeApiCall<T>(endpoint: string, fallbackData: T): Promise<{ data: T; source: "api" | "mock" }> {
    const backendUrl = await this.findWorkingBackend()

    if (!backendUrl) {
      console.log(`Using mock data for ${endpoint}`)
      return { data: fallbackData, source: "mock" }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${backendUrl}/api${endpoint}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { data, source: "api" }
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error)
      this.backendConnected = false
      return { data: fallbackData, source: "mock" }
    }
  }

  async checkBackendHealth(): Promise<boolean> {
    const backendUrl = await this.findWorkingBackend()
    return backendUrl !== null
  }

  async checkAuthStatus(): Promise<AuthStatus> {
    const fallbackStatus: AuthStatus = {
      authenticated: false,
      token_expires: null,
      status: "mock_mode",
    }

    const result = await this.makeApiCall("/auth/status", fallbackStatus)
    return result.data
  }

  async testAuthentication(): Promise<any> {
    const fallbackResult = {
      auth_success: false,
      error: "Backend not available",
    }

    const result = await this.makeApiCall("/test-auth", fallbackResult)
    return result.data
  }

  async getAvailableStocks(): Promise<{ stocks: string[]; source: string }> {
    const defaultStocks = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"]
    const fallbackData = { stocks: defaultStocks, source: "mock" }

    const result = await this.makeApiCall("/stocks", fallbackData)
    return result.data
  }

  async getStockData(symbol: string, minutes = 30): Promise<StockResponse> {
    const mockData = generateRealisticStockData(symbol, minutes)
    const mockResponse: StockResponse = {
      symbol,
      data: mockData,
      average: mockData.reduce((sum, item) => sum + item.price, 0) / mockData.length,
      count: mockData.length,
      timeRange: minutes,
      source: "mock",
    }

    const result = await this.makeApiCall(`/stocks/${symbol}?minutes=${minutes}`, mockResponse)
    return { ...result.data, source: result.source }
  }

  async getCorrelationData(symbols: string[], minutes = 30): Promise<CorrelationResponse> {
    // Generate mock correlation data
    const stockDataMap: { [key: string]: number[] } = {}
    const correlations: { [key: string]: { [key: string]: number } } = {}
    const statistics: { [key: string]: { average: number; stdDev: number } } = {}

    // Generate mock data for each symbol
    for (const symbol of symbols) {
      const mockData = generateRealisticStockData(symbol, minutes)
      const prices = mockData.map((d) => d.price)
      stockDataMap[symbol] = prices
      statistics[symbol] = calculateStats(prices)
    }

    // Calculate correlations
    for (const symbol1 of symbols) {
      correlations[symbol1] = {}
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          correlations[symbol1][symbol2] = 1.0
        } else {
          correlations[symbol1][symbol2] = calculateCorrelation(stockDataMap[symbol1], stockDataMap[symbol2])
        }
      }
    }

    const mockResponse: CorrelationResponse = {
      correlations,
      statistics,
      symbols,
      timeRange: minutes,
      source: "mock",
    }

    const symbolsParam = symbols.map((s) => `symbols=${s}`).join("&")
    const result = await this.makeApiCall(`/correlation?minutes=${minutes}&${symbolsParam}`, mockResponse)
    return { ...result.data, source: result.source }
  }

  isBackendConnected(): boolean {
    return this.backendConnected
  }

  getActiveBackendUrl(): string | null {
    return ACTIVE_BACKEND_URL
  }

  // Reset connection state (useful for retry)
  resetConnection(): void {
    this.connectionAttempted = false
    this.backendConnected = false
    ACTIVE_BACKEND_URL = null
  }
}

export const apiService = new ApiService()
