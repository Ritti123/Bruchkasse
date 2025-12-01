import { openDB, type DBSchema, type IDBPDatabase } from "idb"

interface Article {
  ean: string
  articleNumber?: string
  name: string
  unit: string
  price: number
}

interface Sale {
  id?: number
  date: string
  personnelNumber: string
  items: CartItem[]
  total: number
  paid: boolean
}

interface CartItem extends Article {
  quantity: number
}

interface Backup {
  id?: number
  date: string
  articles: Article[]
  sales: Sale[]
  autoBackup: boolean
}

interface BruchDB extends DBSchema {
  articles: {
    key: string
    value: Article
    indexes: { "by-name": string }
  }
  sales: {
    key: number
    value: Sale
    indexes: { "by-date": string }
  }
  backups: {
    key: number
    value: Backup
    indexes: { "by-date": string }
  }
}

let db: IDBPDatabase<BruchDB> | null = null

export async function initDB(): Promise<IDBPDatabase<BruchDB>> {
  if (db) return db

  db = await openDB<BruchDB>("bruch-kassensystem", 3, {
    upgrade(database, oldVersion) {
      // Articles store
      if (!database.objectStoreNames.contains("articles")) {
        const articleStore = database.createObjectStore("articles", { keyPath: "ean" })
        articleStore.createIndex("by-name", "name")
      }

      // Sales store
      if (!database.objectStoreNames.contains("sales")) {
        const salesStore = database.createObjectStore("sales", {
          keyPath: "id",
          autoIncrement: true,
        })
        salesStore.createIndex("by-date", "date")
      }

      if (!database.objectStoreNames.contains("backups")) {
        const backupsStore = database.createObjectStore("backups", {
          keyPath: "id",
          autoIncrement: true,
        })
        backupsStore.createIndex("by-date", "date")
      }
    },
  })

  return db
}

export async function getDB(): Promise<IDBPDatabase<BruchDB>> {
  if (!db) {
    return await initDB()
  }
  return db
}

// Article functions
export async function getAllArticles(): Promise<Article[]> {
  const database = await getDB()
  return database.getAll("articles")
}

export async function getArticle(ean: string): Promise<Article | undefined> {
  const database = await getDB()
  return database.get("articles", ean)
}

export const getArticleByEan = getArticle

export async function saveArticle(article: Article): Promise<void> {
  const database = await getDB()
  await database.put("articles", article)
}

export async function deleteArticle(ean: string): Promise<void> {
  const database = await getDB()
  await database.delete("articles", ean)
}

export async function searchArticles(query: string): Promise<Article[]> {
  const articles = await getAllArticles()
  const lowerQuery = query.toLowerCase()
  return articles.filter(
    (a) => a.name.toLowerCase().includes(lowerQuery) || a.ean.includes(query) || a.articleNumber?.includes(query),
  )
}

export async function importArticles(
  articles: Article[],
  mode: "overwrite" | "merge",
): Promise<{ added: number; updated: number }> {
  const database = await getDB()
  let added = 0
  let updated = 0

  const tx = database.transaction("articles", "readwrite")

  if (mode === "overwrite") {
    await tx.store.clear()
  }

  for (const article of articles) {
    const existing = await tx.store.get(article.ean)
    if (existing) {
      updated++
    } else {
      added++
    }
    await tx.store.put(article)
  }

  await tx.done
  return { added, updated }
}

// Sales functions
export async function saveSale(sale: Omit<Sale, "id">): Promise<number> {
  const database = await getDB()
  const saleWithPaid = { ...sale, paid: sale.paid ?? false }
  return database.add("sales", saleWithPaid as Sale)
}

export async function getAllSales(): Promise<Sale[]> {
  const database = await getDB()
  const sales = await database.getAll("sales")
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function deleteSale(id: number): Promise<void> {
  const database = await getDB()
  await database.delete("sales", id)
}

export async function clearAllSales(): Promise<void> {
  const database = await getDB()
  const tx = database.transaction("sales", "readwrite")
  await tx.store.clear()
  await tx.done
}

export async function updateSalePaidStatus(id: number, paid: boolean): Promise<void> {
  const database = await getDB()
  const sale = await database.get("sales", id)
  if (sale) {
    sale.paid = paid
    await database.put("sales", sale)
  }
}

// Backup functions
export async function createBackup(autoBackup = false): Promise<number> {
  const database = await getDB()
  const articles = await getAllArticles()
  const sales = await getAllSales()

  const backup: Omit<Backup, "id"> = {
    date: new Date().toISOString(),
    articles,
    sales,
    autoBackup,
  }

  // Alte Auto-Backups bereinigen (nur die letzten 10 behalten)
  if (autoBackup) {
    const allBackups = await getAllBackups()
    const autoBackups = allBackups.filter((b) => b.autoBackup)
    if (autoBackups.length >= 10) {
      const toDelete = autoBackups.slice(10)
      for (const b of toDelete) {
        if (b.id) await deleteBackup(b.id)
      }
    }
  }

  return database.add("backups", backup as Backup)
}

export async function createActionBackup(): Promise<void> {
  const database = await getDB()
  const articles = await getAllArticles()
  const sales = await getAllSales()

  const backup: Omit<Backup, "id"> = {
    date: new Date().toISOString(),
    articles,
    sales,
    autoBackup: false, // Alle sind jetzt normale Backups
  }

  // FIFO: Alte Backups bereinigen (nur die letzten 10 behalten)
  const allBackups = await getAllBackups()
  if (allBackups.length >= 10) {
    // Älteste löschen
    const toDelete = allBackups.slice(9) // Behalte nur 9, damit nach dem neuen Insert 10 da sind
    for (const b of toDelete) {
      if (b.id) await deleteBackup(b.id)
    }
  }

  await database.add("backups", backup as Backup)
}

export async function getAllBackups(): Promise<Backup[]> {
  const database = await getDB()
  const backups = await database.getAll("backups")
  return backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getLastBackupTime(): Promise<Date | null> {
  const backups = await getAllBackups()
  if (backups.length === 0) return null
  return new Date(backups[0].date)
}

export async function deleteBackup(id: number): Promise<void> {
  const database = await getDB()
  await database.delete("backups", id)
}

export async function restoreBackup(id: number): Promise<{ articles: number; sales: number }> {
  const database = await getDB()
  const backup = await database.get("backups", id)

  if (!backup) {
    throw new Error("Backup nicht gefunden")
  }

  // Vor Wiederherstellung ein Backup erstellen
  await createBackup(false)

  // Artikel wiederherstellen
  const articleTx = database.transaction("articles", "readwrite")
  await articleTx.store.clear()
  for (const article of backup.articles) {
    await articleTx.store.put(article)
  }
  await articleTx.done

  // Verkäufe wiederherstellen
  const salesTx = database.transaction("sales", "readwrite")
  await salesTx.store.clear()
  for (const sale of backup.sales) {
    await salesTx.store.put(sale)
  }
  await salesTx.done

  return {
    articles: backup.articles.length,
    sales: backup.sales.length,
  }
}
