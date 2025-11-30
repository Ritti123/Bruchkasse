"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Camera, Tag, Package, X, ShoppingCart, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getAllArticles, getArticleByEan } from "@/lib/db"
import type { Article } from "@/types"

interface PriceCheckProps {
  onAddToCart?: (article: Article) => void
}

export function PriceCheck({ onAddToCart }: PriceCheckProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    loadArticles()
  }, [])

  async function loadArticles() {
    const data = await getAllArticles()
    setArticles(data)
  }

  const filteredArticles = articles.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ean.includes(searchTerm) ||
      (a.articleNumber && a.articleNumber.includes(searchTerm)),
  )

  // Scanner Funktionen
  async function startScanner() {
    setIsScanning(true)
    setScannerError(null)

    try {
      const { Html5Qrcode } = await import("html5-qrcode")

      const scanner = new Html5Qrcode("price-check-scanner", {
        verbose: false,
      })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 1.7777778,
        },
        async (decodedText) => {
          // Artikel suchen
          const article = await getArticleByEan(decodedText)
          if (article) {
            // Feedback
            if (navigator.vibrate) navigator.vibrate(100)
            playBeep(true)
            setSelectedArticle(article)
            stopScanner()
          } else {
            // Nicht gefunden
            if (navigator.vibrate) navigator.vibrate([50, 50, 50])
            playBeep(false)
            setScannerError(`Artikel mit EAN ${decodedText} nicht gefunden`)
            setTimeout(() => setScannerError(null), 3000)
          }
        },
        () => {},
      )
    } catch (err: any) {
      console.error("Scanner-Fehler:", err)
      setScannerError("Kamera konnte nicht gestartet werden")
      setIsScanning(false)
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
      } catch (e) {
        // Ignorieren
      }
    }
    setIsScanning(false)
  }

  function playBeep(success: boolean) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = success ? 1200 : 400
      oscillator.type = "sine"
      gainNode.gain.value = 0.3

      oscillator.start()
      setTimeout(() => oscillator.stop(), success ? 100 : 200)
    } catch (e) {
      // Audio nicht verfügbar
    }
  }

  function handleAddToCart() {
    if (selectedArticle && onAddToCart) {
      onAddToCart(selectedArticle)
      setSelectedArticle(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold">Preisauskunft</h2>
        <p className="text-sm text-muted-foreground">Artikel scannen oder suchen</p>
      </div>

      {/* Scanner Button */}
      <Button
        className={`w-full h-16 text-lg ${isScanning ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
        onClick={isScanning ? stopScanner : startScanner}
      >
        {isScanning ? (
          <>
            <X className="h-6 w-6 mr-2" />
            Scanner beenden
          </>
        ) : (
          <>
            <Camera className="h-6 w-6 mr-2" />
            Barcode scannen
          </>
        )}
      </Button>

      {/* Scanner View */}
      {isScanning && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <div id="price-check-scanner" className="w-full" style={{ minHeight: "250px" }} />
            {scannerError && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white p-3 text-center text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                {scannerError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suchfeld */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Name, EAN oder Art.-Nr. suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Artikelliste */}
      <div className="space-y-2 max-h-[50vh] overflow-auto">
        {filteredArticles.map((article) => (
          <Card
            key={article.ean}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedArticle(article)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{article.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>EAN: {article.ean}</span>
                    {article.articleNumber && <span>Art.-Nr: {article.articleNumber}</span>}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className="font-bold text-emerald-600">{article.price.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">/ {article.unit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {searchTerm && filteredArticles.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Keine Artikel gefunden</p>
        )}
      </div>

      {/* Artikel-Detail Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Artikelinfo
            </DialogTitle>
          </DialogHeader>
          {selectedArticle && (
            <div className="space-y-4">
              <div className="text-center py-4 bg-muted rounded-lg">
                <p className="text-4xl font-bold text-emerald-600">{selectedArticle.price.toFixed(2)} €</p>
                <p className="text-muted-foreground">pro {selectedArticle.unit}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold">{selectedArticle.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-xs">EAN</p>
                    <p className="font-mono font-medium">{selectedArticle.ean}</p>
                  </div>
                  {selectedArticle.articleNumber && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-xs">Artikelnummer</p>
                      <p className="font-mono font-medium">{selectedArticle.articleNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {onAddToCart && (
                <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  In den Warenkorb
                </Button>
              )}

              <Button variant="outline" className="w-full bg-transparent" onClick={() => setSelectedArticle(null)}>
                Schließen
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
