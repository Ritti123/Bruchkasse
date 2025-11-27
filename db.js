const DB_NAME = 'BruchverkaufDB';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        this.db = await idb.openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Artikel-Tabelle
                if (!db.objectStoreNames.contains('articles')) {
                    const articleStore = db.createObjectStore('articles', { keyPath: 'id', autoIncrement: true });
                    articleStore.createIndex('ean', 'ean', { unique: true });
                    articleStore.createIndex('articleNumber', 'articleNumber');
                    articleStore.createIndex('name', 'name');
                }

                // Verkäufe-Tabelle
                if (!db.objectStoreNames.contains('sales')) {
                    const saleStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                    saleStore.createIndex('date', 'date');
                    saleStore.createIndex('personalNumber', 'personalNumber');
                }
            }
        });
    }

    // Artikel-Operationen
    async addArticle(article) {
        return await this.db.add('articles', {
            ...article,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    async getArticle(id) {
        return await this.db.get('articles', id);
    }

    async getArticleByEAN(ean) {
        if (!ean) return null;
        return await this.db.getFromIndex('articles', 'ean', ean);
    }

    async getArticleByNumber(articleNumber) {
        if (!articleNumber) return null;
        return await this.db.getFromIndex('articles', 'articleNumber', articleNumber);
    }

    async getAllArticles() {
        return await this.db.getAll('articles');
    }

    async searchArticles(query) {
        if (!query) return [];

        const normalizedQuery = query.toLowerCase().trim();
        const allArticles = await this.getAllArticles();

        return allArticles.filter(article => {
            return (
                (article.name && article.name.toLowerCase().includes(normalizedQuery)) ||
                (article.ean && article.ean.includes(normalizedQuery)) ||
                (article.articleNumber && article.articleNumber.toLowerCase().includes(normalizedQuery))
            );
        });
    }

    async updateArticle(id, updates) {
        const article = await this.getArticle(id);
        if (article) {
            return await this.db.put('articles', {
                ...article,
                ...updates,
                updatedAt: new Date()
            });
        }
    }

    async deleteArticle(id) {
        return await this.db.delete('articles', id);
    }

    // Verkaufs-Operationen
    async addSale(sale) {
        return await this.db.add('sales', {
            ...sale,
            date: new Date()
        });
    }

    async getAllSales() {
        return await this.db.getAll('sales');
    }

    async getSalesByDateRange(startDate, endDate) {
        const sales = await this.getAllSales();
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });
    }

    // Export/Import
    async exportArticles() {
        return await this.getAllArticles();
    }

    async importArticles(articles, mode = 'overwrite') {
        const tx = this.db.transaction('articles', 'readwrite');
        
        if (mode === 'overwrite') {
            await tx.store.clear();
        }

        for (const article of articles) {
            await tx.store.add(article);
        }

        await tx.done;
        return articles.length;
    }

    async exportSales() {
        return await this.getAllSales();
    }

    async clearDatabase() {
        const tx = this.db.transaction(
            ['articles', 'sales'],
            'readwrite'
        );
        
        await Promise.all([
            tx.objectStore('articles').clear(),
            tx.objectStore('sales').clear()
        ]);
        
        await tx.done;
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Globale Instanz erstellen
const db = new Database();

// Für Entwicklungszwecke: Datenbank im globalen Scope verfügbar machen
window.db = db;