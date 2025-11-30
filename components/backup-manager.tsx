"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Database, Download, Upload, Clock, AlertTriangle, CheckCircle, Trash2, RotateCcw, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createBackup, getAllBackups, deleteBackup, restoreBackup, getLastBackupTime } from "@/lib/db"

interface Backup {
  id?: number
  date: string
  articles: { ean: string; name: string; price: number; unit: string; articleNumber?: string }[]
  sales: any[]
  autoBackup: boolean
}

interface BackupManagerProps {
  onBackupRestored?: () => void
}

export function useAutoBackup() {
  const lastBackupTimeRef = useRef<number>(Date.now())
  const AUTO_BACKUP_INTERVAL = 10 * 60 * 1000 // 10 Minuten

  useEffect(() => {
    const savedAutoBackup = localStorage.getItem("bruch-auto-backup")
    const isEnabled = savedAutoBackup !== "false" // Default: aktiviert

    if (!isEnabled) return

    // Beim Start prüfen ob Backup fällig ist
    const checkAndBackup = async () => {
      const lastBackupStr = localStorage.getItem("bruch-last-auto-backup")
      const lastBackup = lastBackupStr ? Number.parseInt(lastBackupStr) : 0
      const timeSince = Date.now() - lastBackup

      if (timeSince >= AUTO_BACKUP_INTERVAL) {
        try {
          await createBackup(true)
          localStorage.setItem("bruch-last-auto-backup", Date.now().toString())
          lastBackupTimeRef.current = Date.now()
        } catch (e) {
          console.error("Auto-Backup fehlgeschlagen:", e)
        }
      }
    }

    // Sofort beim Laden prüfen
    checkAndBackup()

    // Regelmäßiges Intervall
    const interval = setInterval(async () => {
      try {
        await createBackup(true)
        localStorage.setItem("bruch-last-auto-backup", Date.now().toString())
        lastBackupTimeRef.current = Date.now()
      } catch (e) {
        console.error("Auto-Backup fehlgeschlagen:", e)
      }
    }, AUTO_BACKUP_INTERVAL)

    // Bei Sichtbarkeitsänderung (Tab wechsel, App wieder öffnen) prüfen
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAndBackup()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    // Bei Schließen/Verlassen der Seite Backup erstellen
    const handleBeforeUnload = async () => {
      const lastBackupStr = localStorage.getItem("bruch-last-auto-backup")
      const lastBackup = lastBackupStr ? Number.parseInt(lastBackupStr) : 0
      if (Date.now() - lastBackup >= 60000) {
        // Mindestens 1 Minute seit letztem Backup
        try {
          await createBackup(true)
          localStorage.setItem("bruch-last-auto-backup", Date.now().toString())
        } catch (e) {
          // Ignorieren beim Schließen
        }
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])
}

export function BackupManager({ onBackupRestored }: BackupManagerProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)
  const [lastBackup, setLastBackup] = useState<Date | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState<Backup | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Backup | null>(null)
  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const loadBackups = useCallback(async () => {
    const allBackups = await getAllBackups()
    setBackups(allBackups)
    const lastTime = await getLastBackupTime()
    setLastBackup(lastTime)
  }, [])

  useEffect(() => {
    loadBackups()

    const savedAutoBackup = localStorage.getItem("bruch-auto-backup")
    if (savedAutoBackup !== null) {
      setAutoBackupEnabled(savedAutoBackup !== "false")
    }
  }, [loadBackups])

  const handleAutoBackupToggle = (enabled: boolean) => {
    setAutoBackupEnabled(enabled)
    localStorage.setItem("bruch-auto-backup", enabled.toString())
  }

  const handleCreateBackup = async () => {
    setIsCreating(true)
    try {
      await createBackup(false)
      localStorage.setItem("bruch-last-auto-backup", Date.now().toString())
      await loadBackups()
      showNotification("success", "Backup erfolgreich erstellt!")
    } catch (e) {
      showNotification("error", "Backup konnte nicht erstellt werden")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async (backup: Backup) => {
    try {
      const result = await restoreBackup(backup.id!)
      await loadBackups()
      setRestoreConfirm(null)
      showNotification("success", `Backup wiederhergestellt: ${result.articles} Artikel, ${result.sales} Verkäufe`)
      onBackupRestored?.()
    } catch (e) {
      showNotification("error", "Wiederherstellung fehlgeschlagen")
    }
  }

  const handleDelete = async (backup: Backup) => {
    try {
      await deleteBackup(backup.id!)
      await loadBackups()
      setDeleteConfirm(null)
      showNotification("success", "Backup gelöscht")
    } catch (e) {
      showNotification("error", "Löschen fehlgeschlagen")
    }
  }

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTimeSinceLastBackup = () => {
    if (!lastBackup) return "Noch kein Backup"
    const diff = Date.now() - lastBackup.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Gerade eben"
    if (minutes < 60) return `Vor ${minutes} Min.`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Vor ${hours} Std.`
    const days = Math.floor(hours / 24)
    return `Vor ${days} Tag${days > 1 ? "en" : ""}`
  }

  const needsBackupWarning = () => {
    if (!lastBackup) return true
    const diff = Date.now() - lastBackup.getTime()
    return diff > 60 * 60 * 1000
  }

  const handleExportBackup = (backup: Backup) => {
    const data = JSON.stringify(backup, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bruch-backup-${new Date(backup.date).toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showNotification("success", "Backup exportiert")
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div
          className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Backup Status */}
      <Card className={needsBackupWarning() ? "border-amber-500 bg-amber-50 dark:bg-amber-950" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {needsBackupWarning() ? (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              ) : (
                <Shield className="h-8 w-8 text-emerald-500" />
              )}
              <div>
                <p className="font-semibold">{needsBackupWarning() ? "Backup empfohlen" : "Daten gesichert"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTimeSinceLastBackup()}
                </p>
              </div>
            </div>
            <Button onClick={handleCreateBackup} disabled={isCreating} className="bg-emerald-600 hover:bg-emerald-700">
              {isCreating ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Jetzt sichern
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Backup Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5" />
            Automatische Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-backup" className="font-medium">
                Alle 10 Minuten sichern
              </Label>
              <p className="text-sm text-muted-foreground">Auch bei Tab-Wechsel und App-Wiederöffnung</p>
            </div>
            <Switch id="auto-backup" checked={autoBackupEnabled} onCheckedChange={handleAutoBackupToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gespeicherte Backups</CardTitle>
          <CardDescription>
            {backups.length} Backup{backups.length !== 1 ? "s" : ""} vorhanden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-auto">
          {backups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Noch keine Backups vorhanden</p>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{formatDate(backup.date)}</p>
                    {backup.autoBackup && (
                      <Badge variant="secondary" className="text-xs">
                        Auto
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {backup.articles.length} Artikel, {backup.sales.length} Verkäufe
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportBackup(backup)}
                    className="text-emerald-600 hover:text-emerald-700 h-8 w-8 p-0"
                    title="Backup exportieren"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRestoreConfirm(backup)}
                    className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                    title="Wiederherstellen"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm(backup)}
                    className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreConfirm} onOpenChange={() => setRestoreConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup wiederherstellen?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Möchtest du das Backup vom <strong>{restoreConfirm && formatDate(restoreConfirm.date)}</strong>{" "}
              wiederherstellen?
            </p>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Alle aktuellen Daten werden überschrieben. Ein Sicherheits-Backup wird automatisch erstellt.
                </span>
              </p>
            </div>
            {restoreConfirm && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  Enthält: {restoreConfirm.articles.length} Artikel, {restoreConfirm.sales.length} Verkäufe
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreConfirm(null)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Wiederherstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup löschen?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Möchtest du das Backup vom <strong>{deleteConfirm && formatDate(deleteConfirm.date)}</strong>{" "}
              unwiderruflich löschen?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
