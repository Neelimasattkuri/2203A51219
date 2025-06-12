"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, RefreshCw, Info, AlertCircle, Server, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { apiService } from "@/lib/api"

interface CorrelationData {
  [key: string]: {
    [key: string]: number
  }
}

interface StockStats {
  [key: string]: {
    average: number
    stdDev: number
  }
}

export default function CorrelationPage() {
  const [timeRange, setTimeRange] = useState(30)
  const [correlationData, setCorrelationData] = useState<CorrelationData>({})
  const [stockStats, setStockStats] = useState<StockStats>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ stock1: string; stock2: string } | null>(null)
  const [stockSymbols, setStockSymbols] = useState<string[]>([])
  const [backendConnected, setBackendConnected] = useState(false)
  const [dataSource, setDataSource] = useState<string>("unknown")
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (!initializing) {
      fetchCorrelationData()
    }
  }, [timeRange, initializing])

  const initializeApp = async () => {
    setInitializing(true)
    setError(null)

    try {
      console.log("🚀 Initializing Correlation Analysis...")
      const isBackendHealthy = await apiService.checkBackendHealth()
      setBackendConnected(isBackendHealthy)

      if (!isBackendHealthy) {
        console.log("⚠️ Backend not available, using demo mode")
      }

      console.log("✅ Correlation app initialization complete")
    } catch (error) {
      console.error("❌ Error during initialization:", error)
      setError("App initialized in demo mode")
      setBackendConnected(false)
    } finally {
      setInitializing(false)
    }
  }

  const retryConnection = async () => {
    setLoading(true)
    setError(null)
    apiService.resetConnection()
    await initializeApp()
    setLoading(false)
  }

  const fetchCorrelationData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use default symbols for correlation analysis
      const symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META"]
      const response = await apiService.getCorrelationData(symbols, timeRange)

      setCorrelationData(response.correlations)
      setStockStats(response.statistics)
      setStockSymbols(response.symbols)
      setDataSource(response.source || "unknown")
    } catch (error) {
      console.error("Error fetching correlation data:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch correlation data")
      setCorrelationData({})
      setStockStats({})
      setStockSymbols([])
      setDataSource("error")
    } finally {
      setLoading(false)
    }
  }

  const getCorrelationColor = (value: number) => {
    if (value > 0.7) return "bg-green-500"
    if (value > 0.3) return "bg-green-400"
    if (value > 0.1) return "bg-green-300"
    if (value > -0.1) return "bg-gray-300"
    if (value > -0.3) return "bg-red-300"
    if (value > -0.7) return "bg-red-400"
    return "bg-red-500"
  }

  const getTextColor = (value: number) => {
    return Math.abs(value) > 0.5 ? "text-white" : "text-gray-800"
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Initializing Correlation Analysis</h2>
          <p className="text-slate-300">Loading correlation data and checking connections...</p>
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
              <h1 className="text-3xl font-bold text-white">Correlation Heatmap</h1>
              <p className="text-slate-300">
                {backendConnected ? "Real-time Pearson correlation analysis" : "Demo correlation analysis"}
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
                {backendConnected ? "Backend Connected" : "Demo Mode"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {dataSource === "api" ? (
                <Wifi className="h-4 w-4 text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-yellow-400" />
              )}
              <span className={`text-sm ${dataSource === "api" ? "text-green-400" : "text-yellow-400"}`}>
                {dataSource === "api" ? "Real Data" : "Demo Data"}
              </span>
            </div>
            <Button onClick={fetchCorrelationData} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
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
                  Using realistic mock correlation data to demonstrate the analysis features.
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

        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="mb-8">
          <Card className="glass-effect border-slate-700 max-w-md">
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

        {/* Legend */}
        <Card className="glass-effect border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Correlation Legend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-slate-300">Strong Positive (0.7+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-300 rounded"></div>
                <span className="text-slate-300">Moderate Positive (0.3+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span className="text-slate-300">Neutral (-0.1 to 0.1)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-300 rounded"></div>
                <span className="text-slate-300">Moderate Negative (-0.3+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-slate-300">Strong Negative (-0.7+)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Correlation Matrix */}
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              Correlation Matrix - Last {timeRange} Minutes
              <Badge className={`${dataSource === "api" ? "bg-green-500" : "bg-blue-500"}`}>
                {dataSource === "api" ? "Real Data" : "Demo Data"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-300">
              {dataSource === "api"
                ? "Real-time correlation data from evaluation service"
                : "Realistic correlation data demonstrating analysis features"}
              . Hover over cells to see detailed statistics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : stockSymbols.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div
                    className={`grid gap-1 text-sm`}
                    style={{ gridTemplateColumns: `repeat(${stockSymbols.length + 1}, minmax(0, 1fr))` }}
                  >
                    {/* Header row */}
                    <div className="p-3 font-semibold text-slate-300"></div>
                    {stockSymbols.map((symbol) => (
                      <div key={symbol} className="p-3 font-semibold text-center text-slate-300">
                        {symbol}
                      </div>
                    ))}

                    {/* Data rows */}
                    {stockSymbols.map((stock1) => (
                      <div key={stock1} className="contents">
                        <div className="p-3 font-semibold text-slate-300">{stock1}</div>
                        {stockSymbols.map((stock2) => {
                          const correlation = correlationData[stock1]?.[stock2] || 0
                          return (
                            <div
                              key={`${stock1}-${stock2}`}
                              className={`p-3 text-center font-medium cursor-pointer correlation-cell ${getCorrelationColor(correlation)} ${getTextColor(correlation)} relative`}
                              onMouseEnter={() => setHoveredCell({ stock1, stock2 })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {correlation.toFixed(3)}

                              {/* Tooltip */}
                              {hoveredCell?.stock1 === stock1 && hoveredCell?.stock2 === stock2 && (
                                <div className="absolute z-20 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg -top-2 left-full ml-2 min-w-48">
                                  <div className="text-white text-xs space-y-1">
                                    <div className="font-semibold">
                                      {stock1} vs {stock2}
                                    </div>
                                    <div>Correlation: {correlation.toFixed(4)}</div>
                                    <div className="border-t border-slate-600 pt-1 mt-1">
                                      <div>{stock1} Stats:</div>
                                      <div>Avg: ${stockStats[stock1]?.average.toFixed(2) || "N/A"}</div>
                                      <div>Std Dev: {stockStats[stock1]?.stdDev.toFixed(2) || "N/A"}</div>
                                    </div>
                                    <div className="border-t border-slate-600 pt-1 mt-1">
                                      <div>{stock2} Stats:</div>
                                      <div>Avg: ${stockStats[stock2]?.average.toFixed(2) || "N/A"}</div>
                                      <div>Std Dev: {stockStats[stock2]?.stdDev.toFixed(2) || "N/A"}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                No correlation data available. Please try refreshing.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
