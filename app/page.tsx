"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3, Activity, Zap } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const features = [
    {
      id: "stock-analysis",
      title: "Stock Price Analysis",
      description: "Real-time stock price tracking with interactive charts and average price indicators",
      icon: TrendingUp,
      href: "/stocks",
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "correlation-heatmap",
      title: "Correlation Heatmap",
      description: "Advanced correlation analysis between multiple stocks with Pearson coefficients",
      icon: BarChart3,
      href: "/correlation",
      color: "from-purple-500 to-pink-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Activity className="h-12 w-12 text-blue-400 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Stock Price Aggregation
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Advanced stock market analysis platform with real-time data visualization and correlation insights
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
              <Zap className="h-3 w-3 mr-1" />
              Real-time
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
              Interactive Charts
            </Badge>
            <Badge variant="secondary" className="bg-green-500/20 text-green-300">
              Advanced Analytics
            </Badge>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.id}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer glass-effect border-slate-700 ${
                  hoveredCard === feature.id ? "shadow-2xl" : "shadow-lg"
                }`}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10`} />
                <CardHeader className="relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-slate-300 mb-6">{feature.description}</CardDescription>
                  <Link href={feature.href}>
                    <Button className={`w-full bg-gradient-to-r ${feature.color} hover:opacity-90 transition-opacity`}>
                      Explore Feature
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Card className="glass-effect border-slate-700 text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-400">15+</div>
              <div className="text-slate-300">Stock Symbols</div>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-700 text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-400">Real-time</div>
              <div className="text-slate-300">Data Updates</div>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-700 text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-400">Advanced</div>
              <div className="text-slate-300">Analytics</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
