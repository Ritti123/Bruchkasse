"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Camera,
  CameraOff,
  Keyboard,
  Plus,
  ShoppingCart,
  Search,
  Package,
  AlertCircle,
  Volume2,
  Check,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getArticle, saveArticle, getAllArticles } from "@/lib/db"
import type { Article } from "@/types"

type View = "dashboard" | "articles" | "scanner" | "cart" | "history" | "import-export" | "backup"

interface ScannerProps {
  onAddToCart: (article: Article) => void
  onNavigate: (view: View) => void
}

export function Scanner({ onAddToCart, onNavigate }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const [lastScanned, setLastScanned] = useState<Article | null>(null)
  const [notFoundEan, setNotFoundEan] = useState<string | null>(null)
  const [newArticleForm, setNewArticleForm] = useState({
    name: "",
    price: "",
    unit: "Stück",
    articleNumber: "",
  })
  const [showArticleSearch, setShowArticleSearch] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [scanFeedback, setScanFeedback] = useState<{
    type: "success" | "duplicate" | "notfound"
    message: string
  } | null>(null)
  const [justCreated, setJustCreated] = useState<Article | null>(null)

  const scannerRef = useRef<any>(null)
  const isProcessingRef = useRef(false)
  const lastCodeRef = useRef<string>("")
  const lastCodeTimeRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  useEffect(() => {
    if (showArticleSearch) {
      getAllArticles().then(setArticles)
    }
  }, [showArticleSearch])

  const filteredArticles = articles.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ean.includes(searchQuery) ||
      a.articleNumber?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const playBeep = useCallback((type: "success" | "error" | "duplicate") => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      if (type === "success") {
        oscillator.frequency.value = 1200
        gainNode.gain.value = 0.3
      } else if (type === "duplicate") {
        oscillator.frequency.value = 400
        gainNode.gain.value = 0.2
      } else {
        oscillator.frequency.value = 300
        gainNode.gain.value = 0.3
      }

      oscillator.type = "sine"

      oscillator.start()

      if (type === "success") {
        setTimeout(() => {
          oscillator.stop()
          audioContext.close()
        }, 150)
      } else if (type === "duplicate") {
        setTimeout(() => {
          oscillator.stop()
          audioContext.close()
        }, 200)
      } else {
        setTimeout(() => {
          oscillator.frequency.value = 250
        }, 150)
        setTimeout(() => {
          oscillator.stop()
          audioContext.close()
        }, 300)
      }
    } catch (e) {
      // Audio nicht verfügbar
    }
  }, [])

  const vibrate = useCallback((type: "success" | "error" | "duplicate") => {
    if (navigator.vibrate) {
      if (type === "success") {
        navigator.vibrate(150)
      } else if (type === "duplicate") {
        navigator.vibrate([50, 50, 50])
      } else {
        navigator.vibrate([100, 50, 100])
      }
    }
  }, [])

  const showFeedback = useCallback((type: "success" | "duplicate" | "notfound", message: string) => {
    setScanFeedback({ type, message })
    setTimeout(
      () => {
        setScanFeedback(null)
      },
      type === "success" ? 1500 : 2500,
    )
  }, [])

  const processEan = useCallback(
    async (ean: string) => {
      if (!ean || isProcessingRef.current) return

      const cleanEan = ean.trim()
      const now = Date.now()

      if (cleanEan === lastCodeRef.current && now - lastCodeTimeRef.current < 3000) {
        playBeep("duplicate")
        vibrate("duplicate")
        showFeedback("duplicate", `"${lastScanned?.name || cleanEan}" bereits gescannt`)
        return
      }

      isProcessingRef.current = true
      lastCodeRef.current = cleanEan
      lastCodeTimeRef.current = now

      try {
        const article = await getArticle(cleanEan)

        if (article) {
          setLastScanned(article)
          onAddToCart(article)
          playBeep("success")
          vibrate("success")
          showFeedback("success", `${article.name} hinzugefügt`)
        } else {
          playBeep("error")
          vibrate("error")
          setNotFoundEan(cleanEan)
          setNewArticleForm({
            name: "",
            price: "",
            unit: "Stück",
            articleNumber: "",
          })
        }
      } finally {
        setTimeout(() => {
          isProcessingRef.current = false
        }, 500)
      }

      setManualInput("")
    },
    [onAddToCart, playBeep, vibrate, showFeedback, lastScanned],
  )

  const startScanning = useCallback(async () => {
    if (isInitializing || scannerRef.current) return

    setScannerError(null)
    setIsInitializing(true)

    try {
      const { Html5Qrcode } = await import("html5-qrcode")

      const scanner = new Html5Qrcode("scanner-container", {
        verbose: false,
        formatsToSupport: undefined,
      })

      scannerRef.current = scanner

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 100 },
        aspectRatio: 1.333,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      }

      await scanner.start(
        { facingMode: "environment" },
        config,
        async (decodedText: string) => {
          await processEan(decodedText)
        },
        () => {
          // Scan-Fehler ignorieren (kontinuierlich)
        },
      )

      setIsScanning(true)
    } catch (err: any) {
      console.error("Scanner-Fehler:", err)

      let errorMessage = "Scanner konnte nicht gestartet werden."

      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        errorMessage = "Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen."
      } else if (err.name === "NotFoundError" || err.message?.includes("not found")) {
        errorMessage = "Keine Kamera gefunden."
      } else if (err.name === "NotReadableError") {
        errorMessage = "Kamera wird von einer anderen App verwendet."
      } else if (err.message?.includes("secure context") || err.message?.includes("HTTPS")) {
        errorMessage = "Kamera-Zugriff nur über HTTPS möglich."
      }

      setScannerError(errorMessage)
      scannerRef.current = null
    } finally {
      setIsInitializing(false)
    }
  }, [isInitializing, processEan])

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current
        if (scanner.isScanning) {
          await scanner.stop()
        }
        await scanner.clear()
      } catch (e) {
        // Ignore cleanup errors
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualInput.trim()) {
      await processEan(manualInput.trim())
    }
  }

  async function handleCreateAndAdd() {
    if (!notFoundEan || !newArticleForm.name || !newArticleForm.price) {
      alert("Bitte Name und Preis ausfüllen!")
      return
    }

    const article: Article = {
      ean: notFoundEan,
      name: newArticleForm.name.trim(),
      price: Number.parseFloat(newArticleForm.price.replace(",", ".")),
      unit: newArticleForm.unit.trim() || "Stück",
      articleNumber: newArticleForm.articleNumber.trim() || undefined,
    }

    await saveArticle(article)
    onAddToCart(article)
    setLastScanned(article)
    setNotFoundEan(null)
    playBeep("success")
    vibrate("success")
    showFeedback("success", `${article.name} angelegt & hinzugefügt`)
  }

  async function handleCreateOnly() {
    if (!notFoundEan || !newArticleForm.name || !newArticleForm.price) {
      alert("Bitte Name und Preis ausfüllen!")
      return
    }

    const article: Article = {
      ean: notFoundEan,
      name: newArticleForm.name.trim(),
      price: Number.parseFloat(newArticleForm.price.replace(",", ".")),
      unit: newArticleForm.unit.trim() || "Stück",
      articleNumber: newArticleForm.articleNumber.trim() || undefined,
    }

    await saveArticle(article)
    setJustCreated(article)
    setNotFoundEan(null)
    playBeep("success")
    vibrate("success")
  }

  function handleAddFromSearch(article: Article) {
    onAddToCart(article)
    setLastScanned(article)
    setShowArticleSearch(false)
    setSearchQuery("")
    playBeep("success")
    vibrate("success")
    showFeedback("success", `${article.name} hinzugefügt`)
  }

  return (
    <div className="space-y-4">
      {scanFeedback && (
        <div
          className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            scanFeedback.type === "success"
              ? "bg-emerald-500 text-white"
              : scanFeedback.type === "duplicate"
                ? "bg-amber-500 text-white"
                : "bg-red-500 text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            {scanFeedback.type === "success" && <Check className="h-6 w-6" />}
            {scanFeedback.type === "duplicate" && <AlertCircle className="h-6 w-6" />}
            {scanFeedback.type === "notfound" && <AlertCircle className="h-6 w-6" />}
            <span className="font-semibold text-lg">{scanFeedback.message}</span>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <Button
            onClick={() => setShowArticleSearch(true)}
            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
          >
            <Package className="h-6 w-6 mr-2" />
            Artikel aus Liste wählen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ minHeight: "300px" }}>
            <div id="scanner-container" className="w-full" style={{ minHeight: "300px" }} />

            {!isScanning && !isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center text-muted-foreground p-4">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p>Kamera starten zum Scannen</p>
                  <p className="text-xs mt-1">EAN-Barcodes werden automatisch erkannt</p>
                </div>
              </div>
            )}

            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center text-muted-foreground p-4">
                  <div className="h-10 w-10 mx-auto mb-2 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p>Kamera wird gestartet...</p>
                </div>
              </div>
            )}

            {scanFeedback?.type === "success" && isScanning && (
              <div className="absolute inset-0 bg-emerald-500/30 animate-pulse pointer-events-none" />
            )}
          </div>

          {scannerError && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{scannerError}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                disabled={isInitializing}
                className="flex-1 h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                <Camera className="h-6 w-6 mr-2" />
                {isInitializing ? "Wird gestartet..." : "Kamera starten"}
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1 h-14 text-lg">
                <CameraOff className="h-6 w-6 mr-2" />
                Kamera stoppen
              </Button>
            )}
          </div>

          {isScanning && (
            <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" />
              Halte den Barcode in den markierten Bereich - Ton + Vibration bei Erfolg
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="EAN manuell eingeben..."
                className="pl-10 h-12"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" className="h-12 px-6">
              Suchen
            </Button>
          </form>
        </CardContent>
      </Card>

      {lastScanned && (
        <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Hinzugefügt:</p>
                <p className="font-semibold">{lastScanned.name}</p>
                <p className="text-lg font-bold">{lastScanned.price.toFixed(2)} €</p>
              </div>
              <Button onClick={() => onNavigate("cart")} className="bg-emerald-600 hover:bg-emerald-700">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Zur Kasse
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showArticleSearch} onOpenChange={setShowArticleSearch}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Artikel auswählen</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Artikel suchen..."
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-auto space-y-2 min-h-[200px] max-h-[50vh]">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <Card
                  key={article.ean}
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleAddFromSearch(article)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{article.name}</p>
                      <p className="text-sm text-muted-foreground">
                        EAN: {article.ean} {article.articleNumber && `| Art.-Nr.: ${article.articleNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{article.price.toFixed(2)} €</p>
                      <p className="text-xs text-muted-foreground">/{article.unit}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {articles.length === 0
                  ? "Keine Artikel vorhanden. Bitte zuerst Artikel anlegen."
                  : "Keine Artikel gefunden."}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowArticleSearch(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notFoundEan} onOpenChange={() => setNotFoundEan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel nicht gefunden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Der Barcode <strong>{notFoundEan}</strong> wurde nicht gefunden.
              <br />
              Möchtest du einen neuen Artikel anlegen?
            </p>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>EAN (vorbefüllt)</Label>
                <Input value={notFoundEan || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Artikelnummer (optional)</Label>
                <Input
                  value={newArticleForm.articleNumber}
                  onChange={(e) => setNewArticleForm({ ...newArticleForm, articleNumber: e.target.value })}
                  placeholder="ART-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newArticleForm.name}
                  onChange={(e) => setNewArticleForm({ ...newArticleForm, name: e.target.value })}
                  placeholder="Artikelname"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preis (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newArticleForm.price}
                    onChange={(e) => setNewArticleForm({ ...newArticleForm, price: e.target.value })}
                    placeholder="1,99"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Einheit</Label>
                  <Input
                    value={newArticleForm.unit}
                    onChange={(e) => setNewArticleForm({ ...newArticleForm, unit: e.target.value })}
                    placeholder="Stück"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setNotFoundEan(null)}>
              Abbrechen
            </Button>
            <Button variant="secondary" onClick={handleCreateOnly}>
              <Save className="h-4 w-4 mr-2" />
              Nur anlegen
            </Button>
            <Button onClick={handleCreateAndAdd} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Anlegen & hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!justCreated} onOpenChange={() => setJustCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel angelegt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <Check className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="font-semibold">{justCreated?.name}</p>
                <p className="text-sm text-muted-foreground">
                  EAN: {justCreated?.ean} | {justCreated?.price.toFixed(2)} € / {justCreated?.unit}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Der Artikel wurde gespeichert und kann ab sofort gescannt werden.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setJustCreated(null)}>
              Weiter scannen
            </Button>
            <Button
              onClick={() => {
                if (justCreated) {
                  onAddToCart(justCreated)
                  setLastScanned(justCreated)
                }
                setJustCreated(null)
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Doch in Warenkorb
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
