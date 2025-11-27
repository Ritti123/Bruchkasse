{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const DB_NAME = 'BruchverkaufDB';\
const DB_VERSION = 1;\
\
class Database \{\
    constructor() \{\
        this.db = null;\
    \}\
\
    async init() \{\
        this.db = await idb.openDB(DB_NAME, DB_VERSION, \{\
            upgrade(db, oldVersion, newVersion, transaction) \{\
                // Artikel-Tabelle\
                if (!db.objectStoreNames.contains('articles')) \{\
                    const articleStore = db.createObjectStore('articles', \{ keyPath: 'id', autoIncrement: true \});\
                    articleStore.createIndex('ean', 'ean', \{ unique: true \});\
                    articleStore.createIndex('name', 'name');\
                \}\
\
                // Verk\'e4ufe-Tabelle\
                if (!db.objectStoreNames.contains('sales')) \{\
                    const saleStore = db.createObjectStore('sales', \{ keyPath: 'id', autoIncrement: true \});\
                    saleStore.createIndex('date', 'date');\
                    saleStore.createIndex('personalNumber', 'personalNumber');\
                \}\
            \}\
        \});\
    \}\
\
    // Artikel-Operationen\
    async addArticle(article) \{\
        return await this.db.add('articles', \{\
            ...article,\
            createdAt: new Date(),\
            updatedAt: new Date()\
        \});\
    \}\
\
    async getArticle(id) \{\
        return await this.db.get('articles', id);\
    \}\
\
    async getArticleByEAN(ean) \{\
        return await this.db.getFromIndex('articles', 'ean', ean);\
    \}\
\
    async getAllArticles() \{\
        return await this.db.getAll('articles');\
    \}\
\
    async updateArticle(id, updates) \{\
        const article = await this.getArticle(id);\
        if (article) \{\
            return await this.db.put('articles', \{\
                ...article,\
                ...updates,\
                updatedAt: new Date()\
            \});\
        \}\
    \}\
\
    async deleteArticle(id) \{\
        return await this.db.delete('articles', id);\
    \}\
\
    // Verkaufs-Operationen\
    async addSale(sale) \{\
        return await this.db.add('sales', \{\
            ...sale,\
            date: new Date()\
        \});\
    \}\
\
    async getAllSales() \{\
        return await this.db.getAll('sales');\
    \}\
\
    async getSalesByDateRange(startDate, endDate) \{\
        const sales = await this.getAllSales();\
        return sales.filter(sale => \{\
            const saleDate = new Date(sale.date);\
            return saleDate >= startDate && saleDate <= endDate;\
        \});\
    \}\
\
    // Export/Import\
    async exportArticles() \{\
        return await this.getAllArticles();\
    \}\
\
    async importArticles(articles, mode = 'overwrite') \{\
        const tx = this.db.transaction('articles', 'readwrite');\
        \
        if (mode === 'overwrite') \{\
            await tx.store.clear();\
        \}\
\
        for (const article of articles) \{\
            // Pr\'fcfen ob Artikel mit gleicher EAN existiert\
            if (mode === 'merge') \{\
                const existing = await this.getArticleByEAN(article.ean);\
                if (existing) \{\
                    await this.updateArticle(existing.id, article);\
                    continue;\
                \}\
            \}\
            \
            await tx.store.add(\{\
                ...article,\
                createdAt: new Date(),\
                updatedAt: new Date()\
            \});\
        \}\
\
        await tx.done;\
    \}\
\
    async exportSales() \{\
        return await this.getAllSales();\
    \}\
\}\
\
// Globale Datenbank-Instanz\
const db = new Database();}