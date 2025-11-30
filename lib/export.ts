// Import necessary types
import type { Article, Sale } from "../types"

// Export functions for articles
export function exportArticlesAsJSON(articles: Article[]) {
  const data = JSON.stringify(articles, null, 2)
  downloadFile(data, "artikel_export.json", "application/json")
}

export function exportArticlesAsCSV(articles: Article[]) {
  const headers = ["ean", "articleNumber", "name", "unit", "price"]
  const rows = articles.map((a) => [
    a.ean,
    a.articleNumber || "",
    `"${a.name.replace(/"/g, '""')}"`,
    a.unit,
    a.price.toString(),
  ])

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
  downloadFile(csv, "artikel_export.csv", "text/csv;charset=utf-8")
}

// Export functions for sales
export function exportSalesAsJSON(sales: Sale[]) {
  const data = JSON.stringify(sales, null, 2)
  downloadFile(data, "verkaeufe_export.json", "application/json")
}

export function exportSalesAsCSV(sales: Sale[]) {
  const headers = ["id", "datum", "personalnummer", "positionen", "summe", "bezahlt"]
  const rows = sales.map((s) => [
    s.id?.toString() || "",
    s.date,
    s.personnelNumber,
    `"${s.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}"`,
    s.total.toString(),
    s.paid ? "Ja" : "Nein",
  ])

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
  downloadFile(csv, "verkaeufe_export.csv", "text/csv;charset=utf-8")
}

// Parse functions for import
export function parseJSON(content: string): Article[] {
  const data = JSON.parse(content)
  const articles = Array.isArray(data) ? data : [data]

  return articles
    .map((a) => ({
      ean: String(a.ean || a.EAN || "").trim(),
      articleNumber: a.articleNumber || a.artikelnummer || a.artNr || undefined,
      name: String(a.name || a.Name || a.bezeichnung || "").trim(),
      unit: String(a.unit || a.einheit || a.Unit || "Stück").trim(),
      price: Number.parseFloat(String(a.price || a.preis || a.Price || 0).replace(",", ".")),
    }))
    .filter((a) => a.ean && a.name)
}

export function parseCSV(content: string): Article[] {
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return []

  const separator = lines[0].includes(";") ? ";" : ","
  const headers = lines[0]
    .toLowerCase()
    .split(separator)
    .map((h) => h.trim().replace(/"/g, ""))

  const articles: Article[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator)
    if (values.length < headers.length) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim().replace(/^"|"$/g, "") || ""
    })

    const article: Article = {
      ean: row.ean || row.barcode || "",
      articleNumber: row.articlenumber || row.artikelnummer || row.artnr || undefined,
      name: row.name || row.bezeichnung || "",
      unit: row.unit || row.einheit || "Stück",
      price: Number.parseFloat((row.price || row.preis || "0").replace(",", ".")),
    }

    if (article.ean && article.name) {
      articles.push(article)
    }
  }

  return articles
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
