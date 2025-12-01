"use client"

import { useState } from "react"
import { Minus, Plus, Trash2, ShoppingCart, FileText, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { saveSale, createActionBackup } from "@/lib/db"
import { generateReceipt } from "@/lib/pdf"
import type { CartItem } from "@/types"

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

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (ean: string, quantity: number) => void
  onClearCart: () => void
  onNavigate: (view: View) => void
  personnelNumber?: string
}

export function Cart({ items, onUpdateQuantity, onClearCart, onNavigate, personnelNumber }: CartProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [personnelNumberInput, setPersonnelNumberInput] = useState(personnelNumber || "")
  const [isComplete, setIsComplete] = useState(false)
  const [markAsPaid, setMarkAsPaid] = useState(true)

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  async function handleCheckout() {
    const pn = personnelNumberInput.trim() || personnelNumber
    if (!pn) {
      alert("Bitte Personalnummer eingeben!")
      return
    }

    const sale = {
      date: new Date().toISOString(),
      personnelNumber: pn,
      items: [...items],
      total: subtotal,
      paid: markAsPaid,
    }

    await saveSale(sale)
    await createActionBackup()
    generateReceipt(sale)
    setIsComplete(true)
  }

  function handleFinish() {
    onClearCart()
    setIsCheckoutOpen(false)
    setIsComplete(false)
    setPersonnelNumberInput("")
    setMarkAsPaid(true)
    onNavigate("dashboard")
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Warenkorb ist leer</h2>
        <p className="text-muted-foreground mb-4">Scanne Artikel oder wähle sie aus der Liste</p>
        {!personnelNumber && (
          <Alert className="mb-4 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tipp: Nutze die Mehrkunden-Funktion um mehrere Personen gleichzeitig zu bedienen!
            </AlertDescription>
          </Alert>
        )}
        <Button onClick={() => onNavigate("scanner")} className="bg-emerald-500 hover:bg-emerald-600">
          Zum Scanner
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {personnelNumber && (
        <Alert>
          <AlertDescription className="font-semibold">Warenkorb für Pers.-Nr: {personnelNumber}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.ean} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {/* Artikel-Infos links */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span>EAN: {item.ean}</span>
                    {item.articleNumber && <span>Art.-Nr: {item.articleNumber}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.price.toFixed(2)} € / {item.unit}
                  </p>
                </div>

                {/* Preis rechts */}
                <div className="text-right">
                  <p className="font-bold text-base">{(item.price * item.quantity).toFixed(2)} €</p>
                </div>
              </div>

              {/* Menge und Löschen unten */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-transparent"
                    onClick={() => onUpdateQuantity(item.ean, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-semibold text-lg">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-transparent"
                    onClick={() => onUpdateQuantity(item.ean, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-1">{item.unit}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onUpdateQuantity(item.ean, 0)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Entfernen
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Positionen:</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Artikel gesamt:</span>
            <span>{totalItems}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Summe:</span>
            <span className="text-emerald-600">{subtotal.toFixed(2)} €</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 bg-transparent" onClick={onClearCart}>
          <Trash2 className="h-4 w-4 mr-2" />
          Leeren
        </Button>
        <Button
          className="flex-1 h-14 text-lg bg-emerald-500 hover:bg-emerald-600"
          onClick={() => setIsCheckoutOpen(true)}
        >
          <FileText className="h-5 w-5 mr-2" />
          Abschließen
        </Button>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          {!isComplete ? (
            <>
              <DialogHeader>
                <DialogTitle>Verkauf abschließen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="personnelNumber">Personalnummer</Label>
                  <Input
                    id="personnelNumber"
                    value={personnelNumberInput}
                    onChange={(e) => setPersonnelNumberInput(e.target.value)}
                    placeholder="z.B. 12345"
                    className="h-12 text-lg"
                    disabled={!!personnelNumber}
                  />
                  <p className="text-xs text-muted-foreground">
                    Die Personalnummer wird nur für den Beleg verwendet und nicht dauerhaft mit dem Profil verknüpft.
                  </p>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Checkbox
                    id="markAsPaid"
                    checked={markAsPaid}
                    onCheckedChange={(checked) => setMarkAsPaid(checked === true)}
                  />
                  <Label htmlFor="markAsPaid" className="cursor-pointer flex-1">
                    Betrag wurde bezahlt
                  </Label>
                </div>

                <Card className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Zu zahlen:</span>
                      <span>{subtotal.toFixed(2)} €</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCheckout} className="bg-emerald-500 hover:bg-emerald-600">
                  Beleg erstellen
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Verkauf abgeschlossen</DialogTitle>
              </DialogHeader>
              <div className="py-8 text-center">
                <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-lg font-semibold mb-2">Vielen Dank!</p>
                <p className="text-muted-foreground">Der Beleg wurde als PDF heruntergeladen.</p>
                {!markAsPaid && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">Hinweis: Betrag ist noch offen!</p>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleFinish} className="w-full">
                  Fertig
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
