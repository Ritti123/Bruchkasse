"use client"

import { useState, useEffect } from "react"
import { Database, ShoppingCart, Package, History, Settings, Scan, Shield, Tag, Users, QrCode } from "lucide-react"
import { Dashboard } from "@/components/dashboard"
import { ArticleManagement } from "@/components/article-management"
import { Scanner } from "@/components/scanner"
import { Cart } from "@/components/cart"
import { SalesHistory } from "@/components/sales-history"
import { ImportExport } from "@/components/import-export"
import { BackupManager, useAutoBackup } from "@/components/backup-manager"
import { PriceCheck } from "@/components/price-check"
import { QRSync } from "@/components/qr-sync"
import { MultiCustomerCart } from "@/components/multi-customer-cart"
import { initDB } from "@/lib/db"
import type { CartItem, Article } from "@/types"

type View =
  | "dashboard"
  | "articles"
  | "scanner"
  | "cart"
  | "history"
  | "import-export"
  | "backup"
  | "price-check"
  | "qr-sync"
  | "multi-customer"

export default function BruchKassensystem() {
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [dbReady, setDbReady] = useState(false)
  const [currentPersonnelNumber, setCurrentPersonnelNumber] = useState<string>("")

  useAutoBackup()

  useEffect(() => {
    initDB().then(() => setDbReady(true))
  }, [])

  useEffect(() => {
    if (currentPersonnelNumber && cartItems.length > 0) {
      const carts = JSON.parse(localStorage.getItem("customer-carts") || "[]")
      const cartIndex = carts.findIndex((c: any) => c.personnelNumber === currentPersonnelNumber)
      if (cartIndex !== -1) {
        carts[cartIndex].items = cartItems
        localStorage.setItem("customer-carts", JSON.stringify(carts))
      }
    }
  }, [cartItems, currentPersonnelNumber])

  const addToCart = (article: Article) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.ean === article.ean)
      if (existing) {
        return prev.map((item) => (item.ean === article.ean ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { ...article, quantity: 1 }]
    })
  }

  const updateCartQuantity = (ean: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.ean !== ean))
    } else {
      setCartItems((prev) => prev.map((item) => (item.ean === ean ? { ...item, quantity } : item)))
    }
  }

  const clearCart = () => {
    if (currentPersonnelNumber) {
      const carts = JSON.parse(localStorage.getItem("customer-carts") || "[]")
      const updatedCarts = carts.filter((c: any) => c.personnelNumber !== currentPersonnelNumber)
      localStorage.setItem("customer-carts", JSON.stringify(updatedCarts))
      setCurrentPersonnelNumber("")
    }
    setCartItems([])
  }

  function handleSelectCart(personnelNumber: string, items: CartItem[]) {
    setCurrentPersonnelNumber(personnelNumber)
    setCartItems(items)
    setCurrentView("cart")
  }

  function handleUpdateCart(personnelNumber: string, items: CartItem[]) {
    if (personnelNumber === currentPersonnelNumber) {
      setCartItems(items)
    }
  }

  const navItems = [
    { id: "dashboard" as View, icon: Database, label: "Start" },
    { id: "articles" as View, icon: Package, label: "Artikel" },
    { id: "scanner" as View, icon: Scan, label: "Scannen" },
    { id: "price-check" as View, icon: Tag, label: "Preis" },
    { id: "cart" as View, icon: ShoppingCart, label: "Kasse", badge: cartItems.length },
  ]

  const secondaryNavItems = [
    { id: "multi-customer" as View, icon: Users, label: "Mehrkunden" },
    { id: "history" as View, icon: History, label: "Historie" },
    { id: "qr-sync" as View, icon: QrCode, label: "QR-Sync" },
    { id: "import-export" as View, icon: Settings, label: "Import" },
    { id: "backup" as View, icon: Shield, label: "Backup" },
  ]

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Datenbank wird initialisiert...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <h1 className="text-xl font-bold text-center">Bruch-Kassensystem</h1>
        {currentPersonnelNumber && (
          <p className="text-center text-sm opacity-90 mt-1">Pers.-Nr: {currentPersonnelNumber}</p>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pb-24">
        {currentView === "dashboard" && <Dashboard onNavigate={setCurrentView} cartCount={cartItems.length} />}
        {currentView === "articles" && <ArticleManagement />}
        {currentView === "scanner" && <Scanner onAddToCart={addToCart} onNavigate={setCurrentView} />}
        {currentView === "price-check" && <PriceCheck onAddToCart={addToCart} />}
        {currentView === "cart" && (
          <Cart
            items={cartItems}
            onUpdateQuantity={updateCartQuantity}
            onClearCart={clearCart}
            onNavigate={setCurrentView}
            personnelNumber={currentPersonnelNumber}
          />
        )}
        {currentView === "multi-customer" && (
          <MultiCustomerCart onCartSelect={handleSelectCart} onUpdateCart={handleUpdateCart} />
        )}
        {currentView === "history" && <SalesHistory />}
        {currentView === "qr-sync" && <QRSync />}
        {currentView === "import-export" && <ImportExport />}
        {currentView === "backup" && <BackupManager onBackupRestored={() => setCurrentView("dashboard")} />}
      </main>

      {/* Bottom Navigation - zweizeilig für bessere Übersicht */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        {/* Hauptnavigation */}
        <div className="flex justify-around items-center py-1.5 border-b border-border/50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center p-1.5 min-w-[50px] rounded-lg transition-colors relative ${
                currentView === item.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge ? (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {/* Sekundärnavigation */}
        <div className="flex justify-center items-center gap-2 py-1.5 overflow-x-auto">
          {secondaryNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                currentView === item.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
