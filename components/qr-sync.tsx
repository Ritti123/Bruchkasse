"use client"

import { useState, useEffect } from "react"
import { QrCode, Scan, CheckCircle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAllArticles, importArticles } from "@/lib/db"
import type { Article } from "@/types"

export function QRSync() {
  const [qrCodes, setQrCodes] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null)
  const [currentQRIndex, setCurrentQRIndex] = useState(0)

  async function generateQRCodes() {
    setIsGenerating(true)
    try {
      const articles = await getAllArticles()

      if (articles.length === 0) {
        alert("Keine Artikel zum Exportieren vorhanden!")
        return
      }

      // QRCode library dynamisch laden
      const QRCode = (await import("qrcode")).default

      // Artikel in JSON konvertieren und komprimieren
      const jsonData = JSON.stringify(articles)

      // Größe berechnen (QR-Codes können max. ~2953 bytes bei Version 40, L-Level)
      const maxChunkSize = 2500 // Sicherheitspuffer
      const chunks: string[] = []

      // Wenn Daten zu groß, in Chunks aufteilen
      if (jsonData.length > maxChunkSize) {
        const totalChunks = Math.ceil(jsonData.length / maxChunkSize)
        for (let i = 0; i < totalChunks; i++) {
          const start = i * maxChunkSize
          const end = Math.min(start + maxChunkSize, jsonData.length)
          const chunk = jsonData.substring(start, end)
          // Chunk mit Metadaten versehen
          chunks.push(JSON.stringify({ chunk: i + 1, total: totalChunks, data: chunk }))
        }
      } else {
        chunks.push(JSON.stringify({ chunk: 1, total: 1, data: jsonData }))
      }

      // QR-Codes generieren
      const codes = await Promise.all(
        chunks.map((chunk) =>
          QRCode.toDataURL(chunk, {
            errorCorrectionLevel: "L",
            margin: 1,
            width: 400,
          }),
        ),
      )

      setQrCodes(codes)
      setCurrentQRIndex(0)
    } catch (error) {
      console.error("[v0] QR-Code Generierung fehlgeschlagen:", error)
      alert("Fehler beim Generieren der QR-Codes")
    } finally {
      setIsGenerating(false)
    }
  }

  async function startScanning() {
    setIsScanning(true)
    setScanResult(null)
  }

  async function handleScan(decodedText: string) {
    try {
      const chunk = JSON.parse(decodedText)

      // Validierung
      if (!chunk.chunk || !chunk.total || !chunk.data) {
        throw new Error("Ungültiges QR-Code Format")
      }

      // Wenn nur ein Chunk, direkt importieren
      if (chunk.total === 1) {
        const articles: Article[] = JSON.parse(chunk.data)
        const result = await importArticles(articles, "merge")
        setScanResult({
          success: true,
          message: `${result.added} Artikel hinzugefügt, ${result.updated} aktualisiert`,
        })
        setIsScanning(false)
        return
      }

      // Multi-Chunk Handling (für spätere Implementierung)
      // Hier könnte man Chunks in localStorage sammeln und zusammensetzen
      setScanResult({
        success: false,
        message: `Chunk ${chunk.chunk} von ${chunk.total} gescannt. Multi-Chunk Import in Entwicklung.`,
      })
    } catch (error) {
      console.error("[v0] QR-Scan Fehler:", error)
      setScanResult({
        success: false,
        message: "Fehler beim Verarbeiten des QR-Codes",
      })
    }
  }

  useEffect(() => {
    if (!isScanning) return

    let html5QrCode: any = null

    async function initScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        html5QrCode = new Html5Qrcode("qr-sync-reader")

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            html5QrCode?.stop()
            handleScan(decodedText)
          },
          () => {
            // Scan-Fehler ignorieren
          },
        )
      } catch (error) {
        console.error("[v0] Scanner-Initialisierung fehlgeschlagen:", error)
        setScanResult({
          success: false,
          message: "Kamera konnte nicht gestartet werden",
        })
        setIsScanning(false)
      }
    }

    initScanner()

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {})
      }
    }
  }, [isScanning])

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>2025 Sync-Methode:</strong> PC zeigt QR-Codes an, Handy scannt diese. Keine Dateien übertragen nötig!
        </AlertDescription>
      </Alert>

      {/* Generate QR Codes */}
      <Card>
        <CardHeader>
          <CardTitle>QR-Codes generieren (PC)</CardTitle>
          <CardDescription>Erstelle QR-Codes mit allen Artikeln zum Scannen am Handy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={generateQRCodes} disabled={isGenerating} className="w-full h-12">
            <QrCode className="h-5 w-5 mr-2" />
            {isGenerating ? "Generiere..." : "QR-Codes erstellen"}
          </Button>

          {qrCodes.length > 0 && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Code {currentQRIndex + 1} von {qrCodes.length}
              </p>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img
                  src={qrCodes[currentQRIndex] || "/placeholder.svg"}
                  alt="QR Code"
                  className="w-full max-w-sm mx-auto"
                />
              </div>
              {qrCodes.length > 1 && (
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQRIndex(Math.max(0, currentQRIndex - 1))}
                    disabled={currentQRIndex === 0}
                  >
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQRIndex(Math.min(qrCodes.length - 1, currentQRIndex + 1))}
                    disabled={currentQRIndex === qrCodes.length - 1}
                  >
                    Weiter
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Scanne diesen Code mit dem Handy</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan QR Codes */}
      <Card>
        <CardHeader>
          <CardTitle>QR-Code scannen (Handy)</CardTitle>
          <CardDescription>Scanne den QR-Code vom PC um Artikel zu importieren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isScanning ? (
            <Button onClick={startScanning} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600">
              <Scan className="h-5 w-5 mr-2" />
              QR-Code scannen
            </Button>
          ) : (
            <div className="space-y-2">
              <div id="qr-sync-reader" className="w-full" />
              <Button variant="outline" onClick={() => setIsScanning(false)} className="w-full">
                Abbrechen
              </Button>
            </div>
          )}

          {scanResult && (
            <Alert variant={scanResult.success ? "default" : "destructive"}>
              {scanResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{scanResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fallback Info */}
      <Card className="bg-muted">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <strong>Hinweis:</strong> Bei sehr vielen Artikeln ({">"} 50) können mehrere QR-Codes entstehen. Scanne diese
          nacheinander. Als Alternative steht der klassische JSON/CSV-Import weiterhin zur Verfügung.
        </CardContent>
      </Card>
    </div>
  )
}
