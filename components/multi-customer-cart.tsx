"use client"

import { useState, useEffect } from "react"
import { Users, Plus, X, ShoppingCart, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { CartItem } from "@/types"

export interface CustomerCart {
  personnelNumber: string
  items: CartItem[]
  createdAt: string
}

interface MultiCustomerCartProps {
  onCartSelect: (personnelNumber: string, items: CartItem[]) => void
  currentPersonnelNumber?: string
}

export function MultiCustomerCart({ onCartSelect, currentPersonnelNumber }: MultiCustomerCartProps) {
  const [carts, setCarts] = useState<CustomerCart[]>([])
  const [isAddingCart, setIsAddingCart] = useState(false)
  const [newPersonnelNumber, setNewPersonnelNumber] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("customer-carts")
    if (saved) {
      try {
        setCarts(JSON.parse(saved))
      } catch (error) {
        console.error("[v0] Fehler beim Laden der Warenkörbe:", error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("customer-carts", JSON.stringify(carts))
  }, [carts])

  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem("customer-carts")
      if (saved) {
        try {
          const savedCarts = JSON.parse(saved)
          setCarts(savedCarts)
        } catch (error) {
          // Ignorieren
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  function handleAddCart() {
    const pn = newPersonnelNumber.trim()
    if (!pn) {
      alert("Bitte Personalnummer eingeben!")
      return
    }

    if (carts.some((c) => c.personnelNumber === pn)) {
      alert("Diese Personalnummer hat bereits einen Warenkorb!")
      return
    }

    const newCart: CustomerCart = {
      personnelNumber: pn,
      items: [],
      createdAt: new Date().toISOString(),
    }

    const updatedCarts = [...carts, newCart]
    setCarts(updatedCarts)
    localStorage.setItem("customer-carts", JSON.stringify(updatedCarts))

    setNewPersonnelNumber("")
    setIsAddingCart(false)
    onCartSelect(pn, [])
  }

  function handleSelectCart(cart: CustomerCart) {
    onCartSelect(cart.personnelNumber, cart.items)
  }

  function handleRemoveCart(personnelNumber: string) {
    if (confirm(`Warenkorb für Personalnummer ${personnelNumber} wirklich löschen?`)) {
      const updatedCarts = carts.filter((c) => c.personnelNumber !== personnelNumber)
      setCarts(updatedCarts)
      localStorage.setItem("customer-carts", JSON.stringify(updatedCarts))
    }
  }

  function getTotalItems(cart: CustomerCart): number {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  function getTotalPrice(cart: CustomerCart): number {
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mehrere Kunden bedienen
            </CardTitle>
            <Button onClick={() => setIsAddingCart(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Neuer Kunde
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Cart List */}
      {carts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Noch keine Warenkörbe vorhanden</p>
            <p className="text-sm mt-1">Füge einen neuen Kunden hinzu um zu starten</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {carts.map((cart) => {
            const isActive = cart.personnelNumber === currentPersonnelNumber

            return (
              <Card
                key={cart.personnelNumber}
                className={`cursor-pointer transition-all ${
                  isActive ? "border-primary border-2 shadow-lg" : "hover:border-primary/50"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1" onClick={() => handleSelectCart(cart)}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">Pers.-Nr: {cart.personnelNumber}</p>
                        {isActive && (
                          <Badge variant="default" className="bg-primary">
                            <Check className="h-3 w-3 mr-1" />
                            Aktiv
                          </Badge>
                        )}
                        {getTotalItems(cart) > 0 && <Badge variant="secondary">{getTotalItems(cart)} Artikel</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getTotalItems(cart) === 0 ? (
                          "Warenkorb leer"
                        ) : (
                          <span className="text-emerald-600 font-semibold">{getTotalPrice(cart).toFixed(2)} €</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveCart(cart.personnelNumber)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Alle löschen Button */}
      {carts.length > 0 && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive bg-transparent"
          onClick={() => {
            if (confirm("Alle Warenkörbe löschen?")) {
              setCarts([])
              localStorage.setItem("customer-carts", JSON.stringify([]))
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Alle Warenkörbe löschen
        </Button>
      )}

      {/* Add Cart Dialog */}
      <Dialog open={isAddingCart} onOpenChange={setIsAddingCart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Kunden hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-personnel-number">Personalnummer</Label>
            <Input
              id="new-personnel-number"
              value={newPersonnelNumber}
              onChange={(e) => setNewPersonnelNumber(e.target.value)}
              placeholder="z.B. 12345"
              className="mt-2 h-12 text-lg"
              onKeyDown={(e) => e.key === "Enter" && handleAddCart()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCart(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddCart}>Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
