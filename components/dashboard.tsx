"use client"

import { useEffect, useState } from "react"
import { Package, Scan, ShoppingCart, History, ArrowRight, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAllArticles, getAllSales } from "@/lib/db"

type View = "dashboard" | "articles" | "scanner" | "cart" | "history" | "import-export"

interface DashboardProps {
  onNavigate: (view: View) => void
  cartCount: number
}

export function Dashboard({ onNavigate, cartCount }: DashboardProps) {
  const [articleCount, setArticleCount] = useState(0)
  const [todaySales, setTodaySales] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)

  useEffect(() => {
    async function loadStats() {
      const articles = await getAllArticles()
      setArticleCount(articles.length)

      const sales = await getAllSales()
      const today = new Date().toISOString().split("T")[0]
      const todaysSales = sales.filter((s) => s.date.startsWith(today))
      setTodaySales(todaysSales.length)
      setTodayRevenue(todaysSales.reduce((sum, s) => sum + s.total, 0))
    }
    loadStats()
  }, [])

  const quickActions = [
    {
      id: "scanner" as View,
      icon: Scan,
      label: "Artikel scannen",
      description: "Barcode scannen & verkaufen",
      color: "bg-emerald-500 hover:bg-emerald-600",
    },
    {
      id: "cart" as View,
      icon: ShoppingCart,
      label: "Zur Kasse",
      description: `${cartCount} Artikel im Warenkorb`,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "articles" as View,
      icon: Package,
      label: "Artikel verwalten",
      description: "Anlegen, bearbeiten, löschen",
      color: "bg-amber-500 hover:bg-amber-600",
    },
    {
      id: "history" as View,
      icon: History,
      label: "Verkaufshistorie",
      description: "Vergangene Verkäufe ansehen",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Database className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{articleCount}</p>
            <p className="text-xs text-muted-foreground">Artikel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{todaySales}</p>
            <p className="text-xs text-muted-foreground">Verkäufe heute</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{todayRevenue.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">Umsatz heute</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Schnellzugriff</h2>
        {quickActions.map((action) => (
          <Button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className={`w-full h-auto py-4 px-4 ${action.color} text-white justify-between`}
          >
            <div className="flex items-center gap-4">
              <action.icon className="h-8 w-8" />
              <div className="text-left">
                <p className="font-semibold text-lg">{action.label}</p>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6" />
          </Button>
        ))}
      </div>

      {/* Offline indicator */}
      <Card className="bg-muted">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Diese App funktioniert vollständig offline.
            <br />
            Alle Daten werden lokal auf diesem Gerät gespeichert.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
