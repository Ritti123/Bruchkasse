import { jsPDF } from "jspdf"
import type { Sale } from "./path/to/Sale" // Assuming Sale is imported from a different file

export function generateReceipt(sale: Sale) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], // Receipt-like format
  })

  const pageWidth = 80
  const margin = 5
  const contentWidth = pageWidth - margin * 2
  let y = 10

  // Header
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("BRUCH-KASSENSYSTEM", pageWidth / 2, y, { align: "center" })
  y += 8

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Kassenbeleg", pageWidth / 2, y, { align: "center" })
  y += 10

  // Divider
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // Date and Personnel Number
  doc.setFontSize(9)
  const date = new Date(sale.date)
  doc.text(`Datum: ${date.toLocaleDateString("de-DE")}`, margin, y)
  y += 5
  doc.text(`Uhrzeit: ${date.toLocaleTimeString("de-DE")}`, margin, y)
  y += 5
  doc.text(`Pers.-Nr.: ${sale.personnelNumber}`, margin, y)
  y += 8

  // Divider
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // Items
  doc.setFontSize(9)
  sale.items.forEach((item) => {
    // Item name
    const itemName = item.name.length > 25 ? item.name.substring(0, 25) + "..." : item.name
    doc.text(itemName, margin, y)
    y += 4

    // Quantity x Price = Total
    const itemLine = `  ${item.quantity} x ${item.price.toFixed(2)} €`
    const itemTotal = `${(item.quantity * item.price).toFixed(2)} €`
    doc.text(itemLine, margin, y)
    doc.text(itemTotal, pageWidth - margin, y, { align: "right" })
    y += 6
  })

  // Divider
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // Total
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("SUMME:", margin, y)
  doc.text(`${sale.total.toFixed(2)} €`, pageWidth - margin, y, { align: "right" })
  y += 10

  // Footer
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Vielen Dank für Ihren Einkauf!", pageWidth / 2, y, { align: "center" })
  y += 5
  doc.text("Bruchware - Reduzierte Preise", pageWidth / 2, y, { align: "center" })

  // Save
  const filename = `beleg_${date.toISOString().split("T")[0]}_${sale.personnelNumber}.pdf`
  doc.save(filename)
}
