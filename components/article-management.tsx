"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getAllArticles, saveArticle, deleteArticle, searchArticles, createActionBackup } from "@/lib/db"
import type { Article } from "@/types/article" // Import Article type

interface ArticleFormData {
  ean: string
  articleNumber: string
  name: string
  unit: string
  price: string
}

const emptyForm: ArticleFormData = {
  ean: "",
  articleNumber: "",
  name: "",
  unit: "Stück",
  price: "",
}

export function ArticleManagement() {
  const [articles, setArticles] = useState<Article[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [formData, setFormData] = useState<ArticleFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadArticles()
  }, [])

  async function loadArticles() {
    const data = await getAllArticles()
    setArticles(data.sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.trim()) {
      const results = await searchArticles(query)
      setArticles(results)
    } else {
      loadArticles()
    }
  }

  function openCreateDialog() {
    setEditingArticle(null)
    setFormData(emptyForm)
    setIsDialogOpen(true)
  }

  function openEditDialog(article: Article) {
    setEditingArticle(article)
    setFormData({
      ean: article.ean,
      articleNumber: article.articleNumber || "",
      name: article.name,
      unit: article.unit,
      price: article.price.toString(),
    })
    setIsDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.ean || !formData.name || !formData.price) {
      alert("Bitte EAN, Name und Preis ausfüllen!")
      return
    }

    const article: Article = {
      ean: formData.ean.trim(),
      articleNumber: formData.articleNumber.trim() || undefined,
      name: formData.name.trim(),
      unit: formData.unit.trim() || "Stück",
      price: Number.parseFloat(formData.price.replace(",", ".")),
    }

    await saveArticle(article)
    await createActionBackup()
    setIsDialogOpen(false)
    loadArticles()
  }

  async function handleDelete(ean: string) {
    await deleteArticle(ean)
    await createActionBackup()
    setDeleteConfirm(null)
    loadArticles()
  }

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Artikel suchen..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreateDialog} size="icon">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Article Count */}
      <p className="text-sm text-muted-foreground">
        {articles.length} Artikel {searchQuery && `gefunden für "${searchQuery}"`}
      </p>

      {/* Article List */}
      <div className="space-y-2">
        {articles.map((article) => (
          <Card key={article.ean}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{article.name}</p>
                  <p className="text-sm text-muted-foreground">
                    EAN: {article.ean}
                    {article.articleNumber && ` | Art.-Nr.: ${article.articleNumber}`}
                  </p>
                  <p className="text-sm">
                    {article.price.toFixed(2)} € / {article.unit}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(article)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => setDeleteConfirm(article.ean)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {articles.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Keine Artikel vorhanden.</p>
              <p className="text-sm mt-2">Erstelle deinen ersten Artikel oder importiere eine Liste.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ean">EAN / Barcode *</Label>
              <Input
                id="ean"
                value={formData.ean}
                onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
                disabled={!!editingArticle}
                placeholder="4012345678901"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="articleNumber">Artikelnummer (optional)</Label>
              <Input
                id="articleNumber"
                value={formData.articleNumber}
                onChange={(e) => setFormData({ ...formData, articleNumber: e.target.value })}
                placeholder="ART-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Artikelname"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preis (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1,99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Einheit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Stück"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Möchtest du diesen Artikel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
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
    </div>
  )
}
