"use client"

import { useState, useEffect } from "react"
import { Trash2, Download, Calendar, User, ChevronDown, ChevronUp, Check, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getAllSales, deleteSale, clearAllSales, updateSalePaidStatus } from "@/lib/db"
import { generateReceipt } from "@/lib/pdf"
import { exportSalesAsCSV, exportSalesAsJSON } from "@/lib/export"
import type { Sale } from "@/types"

export function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([])
  const [expandedSale, setExpandedSale] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "open">("all")

  useEffect(() => {
    loadSales()
  }, [])

  async function loadSales() {
    const data = await getAllSales()
    setSales(data)
  }

  async function handleDelete(id: number) {
    await deleteSale(id)
    setDeleteConfirm(null)
    loadSales()
  }

  async function handleClearAll() {
    await clearAllSales()
    setClearConfirm(false)
    loadSales()
  }

  async function togglePaidStatus(id: number, currentStatus: boolean) {
    await updateSalePaidStatus(id, !currentStatus)
    loadSales()
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredSales = sales.filter((sale) => {
    if (filterStatus === "all") return true
    if (filterStatus === "paid") return sale.paid === true
    if (filterStatus === "open") return sale.paid !== true
    return true
  })

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const paidRevenue = sales.filter((s) => s.paid).reduce((sum, sale) => sum + sale.total, 0)
  const openRevenue = sales.filter((s) => !s.paid).reduce((sum, sale) => sum + sale.total, 0)
  const openCount = sales.filter((s) => !s.paid).length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{sales.length}</p>
              <p className="text-sm text-muted-foreground">Verkäufe</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} €</p>
              <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center mt-4 pt-4 border-t">
            <div>
              <p className="text-lg font-semibold text-emerald-600">{paidRevenue.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground">Bezahlt</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-600">{openRevenue.toFixed(2)} €</p>
              <p className="text-xs text-muted-foreground">Offen ({openCount})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          className={`flex-1 ${filterStatus === "all" ? "" : "bg-transparent"}`}
          onClick={() => setFilterStatus("all")}
        >
          Alle
        </Button>
        <Button
          variant={filterStatus === "paid" ? "default" : "outline"}
          className={`flex-1 ${filterStatus === "paid" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-transparent"}`}
          onClick={() => setFilterStatus("paid")}
        >
          <Check className="h-4 w-4 mr-1" />
          Bezahlt
        </Button>
        <Button
          variant={filterStatus === "open" ? "default" : "outline"}
          className={`flex-1 ${filterStatus === "open" ? "bg-amber-500 hover:bg-amber-600" : "bg-transparent"}`}
          onClick={() => setFilterStatus("open")}
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Offen
        </Button>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={() => exportSalesAsCSV(sales)}
          disabled={sales.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          CSV Export
        </Button>
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={() => exportSalesAsJSON(sales)}
          disabled={sales.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          JSON Export
        </Button>
      </div>

      {/* Clear All Button */}
      {sales.length > 0 && (
        <Button variant="destructive" className="w-full" onClick={() => setClearConfirm(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Alle Verkäufe löschen
        </Button>
      )}

      {/* Sales List */}
      <div className="space-y-2">
        {filteredSales.map((sale) => (
          <Card
            key={sale.id}
            className={
              sale.paid ? "border-emerald-200 dark:border-emerald-800" : "border-amber-200 dark:border-amber-800"
            }
          >
            <CardContent className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id!)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(sale.date)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <User className="h-4 w-4" />
                    Pers.-Nr.: {sale.personnelNumber}
                  </div>
                  <Badge
                    variant={sale.paid ? "default" : "secondary"}
                    className={`mt-2 ${sale.paid ? "bg-emerald-500" : "bg-amber-500"}`}
                  >
                    {sale.paid ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Bezahlt
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Offen
                      </>
                    )}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{sale.total.toFixed(2)} €</p>
                  <p className="text-sm text-muted-foreground">{sale.items.length} Pos.</p>
                </div>
                {expandedSale === sale.id ? (
                  <ChevronUp className="h-5 w-5 ml-2" />
                ) : (
                  <ChevronDown className="h-5 w-5 ml-2" />
                )}
              </div>

              {expandedSale === sale.id && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {sale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t">
                    <Button
                      variant={sale.paid ? "outline" : "default"}
                      size="sm"
                      className={`w-full ${sale.paid ? "bg-transparent" : "bg-emerald-500 hover:bg-emerald-600"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePaidStatus(sale.id!, sale.paid)
                      }}
                    >
                      {sale.paid ? (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Als offen markieren
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Als bezahlt markieren
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        generateReceipt(sale)
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Beleg
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(sale.id!)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredSales.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>
                {sales.length === 0 ? "Noch keine Verkäufe vorhanden." : "Keine Verkäufe mit diesem Filter gefunden."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verkauf löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Möchtest du diesen Verkauf wirklich löschen?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alle Verkäufe löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Möchtest du wirklich ALLE Verkäufe löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirm(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Alle löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
