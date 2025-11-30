"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Download, FileJson, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { getAllArticles, importArticles } from "@/lib/db"
import { exportArticlesAsCSV, exportArticlesAsJSON, parseCSV, parseJSON } from "@/lib/export"
import type { Article } from "@/lib/types" // Declare the Article variable

export function ImportExport() {
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null)
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge")
  const [pendingImport, setPendingImport] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExportJSON() {
    const articles = await getAllArticles()
    exportArticlesAsJSON(articles)
  }

  async function handleExportCSV() {
    const articles = await getAllArticles()
    exportArticlesAsCSV(articles)
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        let articles: Article[]

        if (file.name.endsWith(".json")) {
          articles = parseJSON(content)
        } else if (file.name.endsWith(".csv")) {
          articles = parseCSV(content)
        } else {
          throw new Error("Nicht unterstütztes Dateiformat. Bitte JSON oder CSV verwenden.")
        }

        if (articles.length === 0) {
          throw new Error("Keine gültigen Artikel in der Datei gefunden.")
        }

        setPendingImport(articles)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Lesen der Datei")
        setPendingImport(null)
      }
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return

    const result = await importArticles(pendingImport, importMode)
    setImportResult(result)
    setPendingImport(null)
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Synchronisation zwischen Geräten</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            1. Erstelle/bearbeite Artikel am PC
            <br />
            2. Exportiere die Artikelliste als JSON oder CSV
            <br />
            3. Übertrage die Datei auf dein Handy
            <br />
            4. Importiere die Datei in der App
          </p>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Artikel exportieren</CardTitle>
          <CardDescription>Exportiere alle Artikel zur Sicherung oder Übertragung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExportJSON} variant="outline" className="w-full h-14 bg-transparent">
            <FileJson className="h-5 w-5 mr-3" />
            <div className="text-left flex-1">
              <p className="font-semibold">Als JSON exportieren</p>
              <p className="text-xs text-muted-foreground">Empfohlen für Import</p>
            </div>
            <Download className="h-5 w-5" />
          </Button>

          <Button onClick={handleExportCSV} variant="outline" className="w-full h-14 bg-transparent">
            <FileSpreadsheet className="h-5 w-5 mr-3" />
            <div className="text-left flex-1">
              <p className="font-semibold">Als CSV exportieren</p>
              <p className="text-xs text-muted-foreground">Für Excel/Tabellen</p>
            </div>
            <Download className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Artikel importieren</CardTitle>
          <CardDescription>Importiere eine JSON- oder CSV-Datei mit Artikeldaten</CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleFileSelect} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} className="w-full h-14">
            <Upload className="h-5 w-5 mr-3" />
            Datei auswählen (JSON/CSV)
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Fehler beim Import</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Display */}
      {importResult && (
        <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">Import erfolgreich!</p>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {importResult.added} Artikel hinzugefügt, {importResult.updated} aktualisiert
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Confirmation Dialog */}
      <Dialog open={!!pendingImport} onOpenChange={() => setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import bestätigen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>
              <strong>{pendingImport?.length}</strong> Artikel gefunden.
              <br />
              Wie sollen bestehende Artikel behandelt werden?
            </p>

            <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as "merge" | "overwrite")}>
              <div className="flex items-start space-x-3 p-3 rounded-lg border">
                <RadioGroupItem value="merge" id="merge" className="mt-1" />
                <div>
                  <Label htmlFor="merge" className="font-semibold">
                    Zusammenführen
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Bestehende Artikel mit gleicher EAN werden aktualisiert, neue hinzugefügt.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border">
                <RadioGroupItem value="overwrite" id="overwrite" className="mt-1" />
                <div>
                  <Label htmlFor="overwrite" className="font-semibold">
                    Überschreiben
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Alle bestehenden Artikel werden gelöscht und durch die importierten ersetzt.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleConfirmImport}>Importieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
