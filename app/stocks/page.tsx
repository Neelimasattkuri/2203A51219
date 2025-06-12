"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  AlertCircle,
  Server,
  CheckCircle,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { apiService, type StockDataPoint } from "@/lib/api"

export default function StocksPage() {
  const [selectedStock, setSelectedStock] = useState("AAPL")
  const [timeRange, setTimeRange] = useState(30)
  const [stockData, setStockData] = useState<StockDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [averagePrice, setAveragePrice] = useState(0)
  const [availableStocks, setAvailableStocks] = useState<string[]>([])
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean
    token_expires: string | null
    status: string
    api_endpoint?: string
  }>({
    authenticated: false,
    token_expires: null,
    status: "unknown",
  })
  const [backendConnected, setBackendConnected] = useState(false)
  const [dataSource, setDataSource] = useState<string>("unknown")
  const [initializing, setInitializing] = useState(true)
  const [stocksSource, setStocksSource] = useState<string>("unknown")
  const [activeBackendUrl, setActiveBackendUrl] = useState<string | null>(null)

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (!initializing) {
      fetchStockData()
    }
  }, [selectedStock, timeRange, initializing])

  const initializeApp = async () => {
    setInitializing(true)
    setError(null)

    try {
      console.log("🚀 Initializing Stock Price Aggregation App...")

      // Check if backend is running
      const isBackendHealthy = await apiService.checkBackendHealth()
      setBackendConnected(isBackendHealthy)
      setActiveBackendUrl(apiService.getActiveBackendUrl())

      if (isBackendHealthy) {
        console.log("✅ Backend is healthy, checking auth status...")
        await checkAuthStatus()
      } else {
        console.log("⚠️ Backend not available, using demo mode")
        setAuthStatus({ authenticated: false, token_expires: null, status: "demo_mode" })
      }

      // Always fetch available stocks (will use defaults if backend unavailable)
      await fetchAvailableStocks()

      console.log("✅ App initialization complete")
    } catch (error) {
      console.error("❌ Error during initialization:", error)
      setError("App initialized in demo mode")
      setBackendConnected(false)
      setAuthStatus({ authenticated: false, token_expires: null, status: "demo_mode" })
      // Set default stocks
      setAvailableStocks(["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"])
      setStocksSource("demo")
    } finally {
      setInitializing(false)
    }
  }

  const checkAuthStatus = async () => {
    try {
      const status = await apiService.checkAuthStatus()
      setAuthStatus(status)
    } catch (error) {
      console.error("Error checking auth status:", error)
      setAuthStatus({ authenticated: false, token_expires: null, status: "error" })
    }
  }

  const testAuthentication = async () => {
    try {
      setLoading(true)
      const result = await apiService.testAuthentication()
      console.log("Auth test result:", result)
      await checkAuthStatus()
    } catch (error) {
      console.error("Auth test failed:", error)
      setError("Authentication test failed")
    } finally {
      setLoading(false)
    }
  }

  const retryConnection = async () => {
    setLoading(true)
    setError(null)
    apiService.resetConnection()
    await initializeApp()
    setLoading(false)
  }

  const fetchAvailableStocks = async () => {
    try {
      const result = await apiService.getAvailableStocks()
      setAvailableStocks(result.stocks)
      setStocksSource(result.source)
      if (result.stocks.length > 0 && !result.stocks.includes(selectedStock)) {
        setSelectedStock(result.stocks[0])
      }
    } catch (error) {
      console.error("Error fetching available stocks:", error)
      const defaultStocks = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"]
      setAvailableStocks(defaultStocks)
      setStocksSource("demo")
    }
  }

  const fetchStockData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.getStockData(selectedStock, timeRange)
      setStockData(response.data)
      setAveragePrice(response.average)
      setDataSource(response.source || "unknown")
    } catch (error) {
      console.error("Error fetching stock data:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch stock data")
      setStockData([])
      setAveragePrice(0)
      setDataSource("error")
    } finally {
      setLoading(false)
    }
  }

  const currentPrice = stockData.length > 0 ? stockData[stockData.length - 1].price : 0
  const previousPrice = stockData.length > 1 ? stockData[stockData.length - 2].price : currentPrice
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300">{`Time: ${label}`}</p>
          <p className="text-blue-400 font-semibold">{`Price: $${payload[0].value.toFixed(2)}`}</p>
        </div>
      )
    }
    return null
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Initializing Stock Price Aggregation</h2>
          <p className="text-slate-300">Connecting to services and loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Stock Price Analysis</h1>
              <p className="text-slate-300">
                {backendConnected ? "Connected to evaluation service" : "Demo mode with realistic data"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {backendConnected ? (
                <Server className="h-4 w-4 text-green-400" />
              ) : (
                <Server className="h-4 w-4 text-yellow-400" />
              )}
              <span className={`text-sm ${backendConnected ? "text-green-400" : "text-yellow-400"}`}>
                {backendConnected ? `Backend: ${activeBackendUrl}` : "Demo Mode"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {authStatus.authenticated ? (
                <Wifi className="h-4 w-4 text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-yellow-400" />
              )}
              <span className={`text-sm ${authStatus.authenticated ? "text-green-400" : "text-yellow-400"}`}>
                {authStatus.authenticated ? "API Connected" : "Mock Data"}
              </span>
            </div>
            <Button onClick={fetchStockData} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Alerts */}
        {!backendConnected && (
          <Alert className="mb-6 border-blue-500 bg-blue-500/10">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-400 flex items-center justify-between">
              <div>
                <div className="font-semibold mb-1">Demo Mode Active</div>
                <div className="text-sm">
                  The Flask backend is not running. The app is using realistic mock data to demonstrate all features.
                  <br />
                  To connect to real data, start the backend:{" "}
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-xs">python app.py</code>
                </div>
              </div>
              <Button onClick={retryConnection} size="sm" variant="outline" disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {backendConnected && !authStatus.authenticated && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-400 flex items-center justify-between">
              <span>
                Backend connected but not authenticated with evaluation service. Using mock data.
                {authStatus.api_endpoint && <span className="text-xs block mt-1">API: {authStatus.api_endpoint}</span>}
              </span>
              <Button onClick={testAuthentication} size="sm" variant="outline" disabled={loading}>
                Test Auth
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {authStatus.authenticated && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-400">
              ✅ Successfully connected to evaluation service API. Displaying real stock data.
              {authStatus.token_expires && (
                <span className="text-xs block mt-1">
                  Token expires: {new Date(authStatus.token_expires).toLocaleString()}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center justify-between">
                Stock Symbol
                <Badge variant="secondary" className="text-xs">
                  {stocksSource === "api" ? "Real" : stocksSource === "mock" ? "Mock" : "Demo"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {availableStocks.map((symbol) => (
                    <SelectItem key={symbol} value={symbol} className="text-white hover:bg-slate-700">
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Time Range</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number.parseInt(value))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="15" className="text-white hover:bg-slate-700">
                    15 minutes
                  </SelectItem>
                  <SelectItem value="30" className="text-white hover:bg-slate-700">
                    30 minutes
                  </SelectItem>
                  <SelectItem value="60" className="text-white hover:bg-slate-700">
                    60 minutes
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-effect border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Current Price</p>
                  <p className="text-2xl font-bold text-white">${currentPrice.toFixed(2)}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Price Change</p>
                  <div className="flex items-center space-x-2">
                    <p className={`text-2xl font-bold ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${Math.abs(priceChange).toFixed(2)}
                    </p>
                    {priceChange >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                </div>
                <Badge variant={priceChange >= 0 ? "default" : "destructive"} className="text-xs">
                  {priceChangePercent >= 0 ? "+" : ""}
                  {priceChangePercent.toFixed(2)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-slate-700">
            <CardContent className="pt-6">
              <div>
                <p className="text-slate-400 text-sm">Average Price</p>
                <p className="text-2xl font-bold text-purple-400">${averagePrice.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              {selectedStock} - Last {timeRange} Minutes
              <Badge className={`${dataSource === "api" ? "bg-green-500" : "bg-blue-500"}`}>
                {dataSource === "api" ? "Real Data" : "Demo Data"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-300">
              {dataSource === "api"
                ? "Real-time data from evaluation service"
                : "Realistic mock data demonstrating app functionality"}{" "}
              with average price indicator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
                </div>
              ) : stockData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={averagePrice}
                      stroke="#A855F7"
                      strokeDasharray="5 5"
                      label={{ value: `Avg: $${averagePrice.toFixed(2)}`, position: "topRight" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No data available. Please try refreshing.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
