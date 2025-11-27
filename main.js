{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 class BruchverkaufApp \{\
    constructor() \{\
        this.currentPage = 'dashboard';\
        this.cart = [];\
        this.html5QrCode = null;\
        this.init();\
    \}\
\
    async init() \{\
        // Datenbank initialisieren\
        await db.init();\
        \
        // Event Listeners\
        this.setupEventListeners();\
        \
        // Seiten laden\
        this.showPage('dashboard');\
        \
        // Service Worker registrieren\
        this.registerServiceWorker();\
    \}\
\
    setupEventListeners() \{\
        // Navigation\
        document.querySelectorAll('.back-btn').forEach(btn => \{\
            btn.addEventListener('click', () => this.showPage('dashboard'));\
        \});\
\
        document.getElementById('scan-btn').addEventListener('click', () => this.showPage('scanner'));\
        document.getElementById('cart-btn').addEventListener('click', () => this.showPage('cart'));\
        document.getElementById('articles-btn').addEventListener('click', () => this.showPage('articles'));\
        document.getElementById('sales-btn').addEventListener('click', () => this.showPage('sales'));\
        document.getElementById('import-export-btn').addEventListener('click', () => this.showPage('import-export'));\
\
        // Scanner\
        document.getElementById('start-scan').addEventListener('click', () => this.startScanner());\
        document.getElementById('stop-scan').addEventListener('click', () => this.stopScanner());\
\
        // Artikelverwaltung\
        document.getElementById('add-article-btn').addEventListener('click', () => this.showArticleModal());\
        document.getElementById('article-search').addEventListener('input', (e) => this.searchArticles(e.target.value));\
        document.getElementById('article-form').addEventListener('submit', (e) => this.saveArticle(e));\
        document.getElementById('cancel-article').addEventListener('click', () => this.hideArticleModal());\
\
        // Warenkorb\
        document.getElementById('clear-cart').addEventListener('click', () => this.clearCart());\
        document.getElementById('checkout-btn').addEventListener('click', () => this.showCheckoutModal());\
\
        // Checkout\
        document.getElementById('checkout-form').addEventListener('submit', (e) => this.completeSale(e));\
        document.getElementById('cancel-checkout').addEventListener('click', () => this.hideCheckoutModal());\
\
        // Import/Export\
        document.getElementById('export-articles-json').addEventListener('click', () => this.exportArticles('json'));\
        document.getElementById('export-articles-csv').addEventListener('click', () => this.exportArticles('csv'));\
        document.getElementById('export-sales').addEventListener('click', () => this.exportSales());\
        document.getElementById('import-file').addEventListener('change', (e) => this.handleFileSelect(e));\
        document.getElementById('import-articles').addEventListener('click', () => this.importArticles());\
    \}\
\
    // Navigation\
    showPage(pageName) \{\
        // Aktuelle Seite ausblenden\
        document.querySelectorAll('.page').forEach(page => \{\
            page.classList.remove('active');\
        \});\
\
        // Spezielle Logik f\'fcr bestimmte Seiten\
        switch(pageName) \{\
            case 'scanner':\
                this.currentPage = 'scanner';\
                break;\
            case 'cart':\
                this.currentPage = 'cart';\
                this.updateCartDisplay();\
                break;\
            case 'articles':\
                this.currentPage = 'articles';\
                this.loadArticles();\
                break;\
            case 'sales':\
                this.currentPage = 'sales';\
                this.loadSales();\
                break;\
            case 'import-export':\
                this.currentPage = 'import-export';\
                break;\
            default:\
                this.currentPage = 'dashboard';\
                if (this.html5QrCode) \{\
                    this.stopScanner();\
                \}\
        \}\
\
        // Neue Seite anzeigen\
        document.getElementById(pageName).classList.add('active');\
    \}\
\
    // Scanner-Funktionen\
    async startScanner() \{\
        try \{\
            this.html5QrCode = new Html5Qrcode("reader");\
            \
            const config = \{\
                fps: 10,\
                qrbox: \{ width: 250, height: 150 \}\
            \};\
\
            await this.html5QrCode.start(\
                \{ facingMode: "environment" \},\
                config,\
                (decodedText) => this.onScanSuccess(decodedText),\
                (errorMessage) => \{\} // Fehler ignorieren\
            );\
\
            document.getElementById('start-scan').disabled = true;\
            document.getElementById('stop-scan').disabled = false;\
        \} catch (err) \{\
            alert('Kamera konnte nicht gestartet werden: ' + err);\
        \}\
    \}\
\
    async stopScanner() \{\
        if (this.html5QrCode) \{\
            await this.html5QrCode.stop();\
            this.html5QrCode.clear();\
            this.html5QrCode = null;\
            \
            document.getElementById('start-scan').disabled = false;\
            document.getElementById('stop-scan').disabled = true;\
            document.getElementById('scan-result').classList.add('hidden');\
        \}\
    \}\
\
    async onScanSuccess(decodedText) \{\
        // Scanner kurz pausieren\
        if (this.html5QrCode) \{\
            await this.html5QrCode.pause();\
        \}\
\
        const ean = decodedText.trim();\
        const article = await db.getArticleByEAN(ean);\
\
        if (article) \{\
            // Artikel gefunden - zum Warenkorb hinzuf\'fcgen\
            this.addToCart(article);\
            this.showScanResult(`Artikel "$\{article.name\}" zum Warenkorb hinzugef\'fcgt`, false);\
        \} else \{\
            // Artikel nicht gefunden - Erstellen anbieten\
            this.showScanResult(`Artikel mit EAN $\{ean\} nicht gefunden`, true, ean);\
        \}\
\
        // Nach 2 Sekunden weiter scannen\
        setTimeout(async () => \{\
            if (this.html5QrCode) \{\
                await this.html5QrCode.resume();\
            \}\
            document.getElementById('scan-result').classList.add('hidden');\
        \}, 2000);\
    \}\
\
    showScanResult(message, showCreateButton = false, ean = '') \{\
        const resultElement = document.getElementById('scan-result');\
        const textElement = document.getElementById('scan-result-text');\
        const actionsElement = document.getElementById('scan-result-actions');\
\
        textElement.textContent = message;\
        actionsElement.innerHTML = '';\
\
        if (showCreateButton) \{\
            const createBtn = document.createElement('button');\
            createBtn.className = 'btn primary';\
            createBtn.textContent = 'Artikel anlegen';\
            createBtn.addEventListener('click', () => \{\
                this.showArticleModal(ean);\
                document.getElementById('scan-result').classList.add('hidden');\
            \});\
            actionsElement.appendChild(createBtn);\
        \}\
\
        resultElement.classList.remove('hidden');\
    \}\
\
    // Warenkorb-Funktionen\
    addToCart(article) \{\
        const existingItem = this.cart.find(item => item.id === article.id);\
        \
        if (existingItem) \{\
            existingItem.quantity += 1;\
        \} else \{\
            this.cart.push(\{\
                ...article,\
                quantity: 1\
            \});\
        \}\
        \
        this.updateCartDisplay();\
    \}\
\
    removeFromCart(articleId) \{\
        this.cart = this.cart.filter(item => item.id !== articleId);\
        this.updateCartDisplay();\
    \}\
\
    updateCartDisplay() \{\
        const cartItemsElement = document.getElementById('cart-items');\
        const subtotalElement = document.getElementById('subtotal');\
        const totalElement = document.getElementById('total');\
        const checkoutBtn = document.getElementById('checkout-btn');\
\
        if (this.cart.length === 0) \{\
            cartItemsElement.innerHTML = '<p class="empty-state">Warenkorb ist leer</p>';\
            checkoutBtn.disabled = true;\
        \} else \{\
            cartItemsElement.innerHTML = this.cart.map(item => `\
                <div class="cart-item">\
                    <div class="cart-item-info">\
                        <div class="cart-item-name">$\{this.escapeHtml(item.name)\}</div>\
                        <div class="cart-item-details">\
                            $\{item.quantity\} \'d7 $\{item.price.toFixed(2)\} \'80\
                        </div>\
                    </div>\
                    <div class="cart-item-price">$\{(item.quantity * item.price).toFixed(2)\} \'80</div>\
                    <div class="cart-item-actions">\
                        <button class="btn secondary" onclick="app.removeFromCart($\{item.id\})">\uc0\u55357 \u56785 \u65039 </button>\
                    </div>\
                </div>\
            `).join('');\
            checkoutBtn.disabled = false;\
        \}\
\
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);\
        subtotalElement.textContent = `$\{subtotal.toFixed(2)\} \'80`;\
        totalElement.textContent = `$\{subtotal.toFixed(2)\} \'80`;\
    \}\
\
    clearCart() \{\
        this.cart = [];\
        this.updateCartDisplay();\
    \}\
\
    // Artikelverwaltung\
    async loadArticles(searchTerm = '') \{\
        const articles = await db.getAllArticles();\
        const articlesListElement = document.getElementById('articles-list');\
        \
        let filteredArticles = articles;\
        if (searchTerm) \{\
            filteredArticles = articles.filter(article => \
                article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||\
                article.ean.includes(searchTerm) ||\
                (article.number && article.number.includes(searchTerm))\
            );\
        \}\
\
        if (filteredArticles.length === 0) \{\
            articlesListElement.innerHTML = '<p class="empty-state">Keine Artikel gefunden</p>';\
        \} else \{\
            articlesListElement.innerHTML = filteredArticles.map(article => `\
                <div class="article-item">\
                    <div class="article-info">\
                        <div class="article-name">$\{this.escapeHtml(article.name)\}</div>\
                        <div class="article-details">\
                            EAN: $\{article.ean\} | $\{article.unit\} | $\{article.price.toFixed(2)\} \'80\
                            $\{article.number ? `| Art.Nr: $\{article.number\}` : ''\}\
                        </div>\
                    </div>\
                    <div class="article-price">$\{article.price.toFixed(2)\} \'80</div>\
                    <div class="article-actions">\
                        <button class="btn secondary" onclick="app.editArticle($\{article.id\})">\uc0\u9999 \u65039 </button>\
                        <button class="btn secondary" onclick="app.deleteArticle($\{article.id\})">\uc0\u55357 \u56785 \u65039 </button>\
                    </div>\
                </div>\
            `).join('');\
        \}\
    \}\
\
    searchArticles(term) \{\
        this.loadArticles(term);\
    \}\
\
    showArticleModal(ean = '') \{\
        document.getElementById('article-modal-title').textContent = ean ? 'Artikel anlegen' : 'Artikel hinzuf\'fcgen';\
        document.getElementById('article-id').value = '';\
        document.getElementById('article-ean').value = ean;\
        document.getElementById('article-number').value = '';\
        document.getElementById('article-name').value = '';\
        document.getElementById('article-unit').value = 'St\'fcck';\
        document.getElementById('article-price').value = '';\
        \
        document.getElementById('article-modal').classList.remove('hidden');\
    \}\
\
    async editArticle(id) \{\
        const article = await db.getArticle(id);\
        if (article) \{\
            document.getElementById('article-modal-title').textContent = 'Artikel bearbeiten';\
            document.getElementById('article-id').value = article.id;\
            document.getElementById('article-ean').value = article.ean;\
            document.getElementById('article-number').value = article.number || '';\
            document.getElementById('article-name').value = article.name;\
            document.getElementById('article-unit').value = article.unit;\
            document.getElementById('article-price').value = article.price;\
            \
            document.getElementById('article-modal').classList.remove('hidden');\
        \}\
    \}\
\
    async saveArticle(event) \{\
        event.preventDefault();\
        \
        const formData = new FormData(event.target);\
        const id = document.getElementById('article-id').value;\
        const article = \{\
            ean: document.getElementById('article-ean').value,\
            number: document.getElementById('article-number').value || null,\
            name: document.getElementById('article-name').value,\
            unit: document.getElementById('article-unit').value,\
            price: parseFloat(document.getElementById('article-price').value)\
        \};\
\
        try \{\
            if (id) \{\
                await db.updateArticle(parseInt(id), article);\
            \} else \{\
                await db.addArticle(article);\
            \}\
            \
            this.hideArticleModal();\
            this.loadArticles();\
        \} catch (error) \{\
            alert('Fehler beim Speichern: ' + error.message);\
        \}\
    \}\
\
    hideArticleModal() \{\
        document.getElementById('article-modal').classList.add('hidden');\
        document.getElementById('article-form').reset();\
    \}\
\
    async deleteArticle(id) \{\
        if (confirm('Artikel wirklich l\'f6schen?')) \{\
            await db.deleteArticle(id);\
            this.loadArticles();\
        \}\
    \}\
\
    // Verkaufshistorie\
    async loadSales() \{\
        const sales = await db.getAllSales();\
        const salesListElement = document.getElementById('sales-list');\
        \
        if (sales.length === 0) \{\
            salesListElement.innerHTML = '<p class="empty-state">Keine Verk\'e4ufe vorhanden</p>';\
        \} else \{\
            salesListElement.innerHTML = sales.reverse().map(sale => `\
                <div class="sale-item">\
                    <div class="sale-info">\
                        <div class="article-name">\
                            $\{new Date(sale.date).toLocaleDateString()\} $\{new Date(sale.date).toLocaleTimeString()\}\
                        </div>\
                        <div class="article-details">\
                            Personalnummer: $\{sale.personalNumber\} | $\{sale.items.length\} Artikel\
                        </div>\
                    </div>\
                    <div class="article-price">$\{sale.total.toFixed(2)\} \'80</div>\
                </div>\
            `).join('');\
        \}\
    \}\
\
    // Checkout\
    showCheckoutModal() \{\
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);\
        \
        document.getElementById('checkout-subtotal').textContent = `$\{subtotal.toFixed(2)\} \'80`;\
        document.getElementById('checkout-total').textContent = `$\{subtotal.toFixed(2)\} \'80`;\
        document.getElementById('personal-number').value = '';\
        \
        document.getElementById('checkout-modal').classList.remove('hidden');\
    \}\
\
    hideCheckoutModal() \{\
        document.getElementById('checkout-modal').classList.add('hidden');\
        document.getElementById('checkout-form').reset();\
    \}\
\
    async completeSale(event) \{\
        event.preventDefault();\
        \
        const personalNumber = document.getElementById('personal-number').value;\
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);\
        \
        const sale = \{\
            personalNumber,\
            items: this.cart.map(item => (\{\
                id: item.id,\
                name: item.name,\
                ean: item.ean,\
                price: item.price,\
                quantity: item.quantity\
            \})),\
            total\
        \};\
\
        try \{\
            await db.addSale(sale);\
            await this.generateReceipt(sale);\
            this.clearCart();\
            this.hideCheckoutModal();\
            this.showPage('dashboard');\
        \} catch (error) \{\
            alert('Fehler beim Abschluss: ' + error.message);\
        \}\
    \}\
\
    async generateReceipt(sale) \{\
        const \{ jsPDF \} = window.jspdf;\
        const doc = new jsPDF();\
        \
        // Kopfzeile\
        doc.setFontSize(20);\
        doc.text('BRUCHVERKAUF', 105, 15, \{ align: 'center' \});\
        \
        doc.setFontSize(12);\
        doc.text(`Datum: $\{new Date().toLocaleDateString()\}`, 20, 30);\
        doc.text(`Uhrzeit: $\{new Date().toLocaleTimeString()\}`, 20, 38);\
        doc.text(`Personalnummer: $\{sale.personalNumber\}`, 20, 46);\
        \
        // Tabelle\
        let y = 60;\
        doc.setFontSize(10);\
        \
        // Tabellenkopf\
        doc.text('Artikel', 20, y);\
        doc.text('Menge', 120, y);\
        doc.text('Preis', 150, y);\
        doc.text('Gesamt', 180, y);\
        \
        y += 8;\
        doc.line(20, y, 190, y);\
        y += 10;\
        \
        // Artikel\
        sale.items.forEach(item => \{\
            if (y > 250) \{\
                doc.addPage();\
                y = 20;\
            \}\
            \
            doc.text(item.name.substring(0, 40), 20, y);\
            doc.text(item.quantity.toString(), 120, y);\
            doc.text(`$\{item.price.toFixed(2)\} \'80`, 150, y);\
            doc.text(`$\{(item.quantity * item.price).toFixed(2)\} \'80`, 180, y);\
            y += 8;\
        \});\
        \
        // Gesamtsumme\
        y += 10;\
        doc.line(20, y, 190, y);\
        y += 15;\
        \
        doc.setFontSize(12);\
        doc.text('Gesamtsumme:', 120, y);\
        doc.text(`$\{sale.total.toFixed(2)\} \'80`, 180, y, \{ align: 'right' \});\
        \
        // Speichern\
        doc.save(`Beleg_$\{sale.personalNumber\}_$\{Date.now()\}.pdf`);\
    \}\
\
    // Import/Export\
    async exportArticles(format) \{\
        const articles = await db.exportArticles();\
        \
        if (format === 'json') \{\
            this.downloadFile(\
                JSON.stringify(articles, null, 2),\
                'articles.json',\
                'application/json'\
            );\
        \} else if (format === 'csv') \{\
            const csv = this.convertToCSV(articles);\
            this.downloadFile(csv, 'articles.csv', 'text/csv');\
        \}\
    \}\
\
    async exportSales() \{\
        const sales = await db.exportSales();\
        this.downloadFile(\
            JSON.stringify(sales, null, 2),\
            `sales_$\{new Date().toISOString().split('T')[0]\}.json`,\
            'application/json'\
        );\
    \}\
\
    handleFileSelect(event) \{\
        const file = event.target.files[0];\
        const importBtn = document.getElementById('import-articles');\
        \
        if (file) \{\
            importBtn.disabled = false;\
        \}\
    \}\
\
    async importArticles() \{\
        const fileInput = document.getElementById('import-file');\
        const file = fileInput.files[0];\
        const mode = document.querySelector('input[name="import-mode"]:checked').value;\
        \
        if (!file) return;\
\
        try \{\
            const content = await this.readFile(file);\
            let articles;\
            \
            if (file.name.endsWith('.json')) \{\
                articles = JSON.parse(content);\
            \} else if (file.name.endsWith('.csv')) \{\
                articles = this.parseCSV(content);\
            \} else \{\
                throw new Error('Ung\'fcltiges Dateiformat');\
            \}\
            \
            await db.importArticles(articles, mode);\
            alert(`Erfolgreich $\{articles.length\} Artikel importiert`);\
            fileInput.value = '';\
            document.getElementById('import-articles').disabled = true;\
            \
            if (this.currentPage === 'articles') \{\
                this.loadArticles();\
            \}\
        \} catch (error) \{\
            alert('Fehler beim Import: ' + error.message);\
        \}\
    \}\
\
    // Hilfsfunktionen\
    downloadFile(content, fileName, contentType) \{\
        const blob = new Blob([content], \{ type: contentType \});\
        const url = URL.createObjectURL(blob);\
        const a = document.createElement('a');\
        a.href = url;\
        a.download = fileName;\
        document.body.appendChild(a);\
        a.click();\
        document.body.removeChild(a);\
        URL.revokeObjectURL(url);\
    \}\
\
    readFile(file) \{\
        return new Promise((resolve, reject) => \{\
            const reader = new FileReader();\
            reader.onload = e => resolve(e.target.result);\
            reader.onerror = reject;\
            reader.readAsText(file);\
        \});\
    \}\
\
    convertToCSV(articles) \{\
        const headers = ['ean', 'number', 'name', 'unit', 'price'];\
        const csv = [\
            headers.join(','),\
            ...articles.map(article => headers.map(header => \{\
                let value = article[header] || '';\
                // Strings in Anf\'fchrungszeichen setzen wenn n\'f6tig\
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) \{\
                    value = `"$\{value.replace(/"/g, '""')\}"`;\
                \}\
                return value;\
            \}).join(','))\
        ];\
        return csv.join('\\n');\
    \}\
\
    parseCSV(csv) \{\
        const lines = csv.split('\\n');\
        const headers = lines[0].split(',').map(h => h.trim());\
        \
        return lines.slice(1).filter(line => line.trim()).map(line => \{\
            const values = this.parseCSVLine(line);\
            const article = \{\};\
            \
            headers.forEach((header, index) => \{\
                if (values[index] !== undefined) \{\
                    let value = values[index].trim();\
                    \
                    if (header === 'price') \{\
                        value = parseFloat(value);\
                    \} else if (header === 'number' && !value) \{\
                        value = null;\
                    \}\
                    \
                    article[header] = value;\
                \}\
            \});\
            \
            return article;\
        \});\
    \}\
\
    parseCSVLine(line) \{\
        const values = [];\
        let current = '';\
        let inQuotes = false;\
        \
        for (let i = 0; i < line.length; i++) \{\
            const char = line[i];\
            \
            if (char === '"') \{\
                inQuotes = !inQuotes;\
            \} else if (char === ',' && !inQuotes) \{\
                values.push(current);\
                current = '';\
            \} else \{\
                current += char;\
            \}\
        \}\
        \
        values.push(current);\
        return values;\
    \}\
\
    escapeHtml(text) \{\
        const div = document.createElement('div');\
        div.textContent = text;\
        return div.innerHTML;\
    \}\
\
    // Service Worker\
    async registerServiceWorker() \{\
        if ('serviceWorker' in navigator) \{\
            try \{\
                await navigator.serviceWorker.register('./service-worker.js');\
                console.log('Service Worker registriert');\
            \} catch (error) \{\
                console.log('Service Worker Registrierung fehlgeschlagen:', error);\
            \}\
        \}\
    \}\
\}\
\
// App initialisieren wenn DOM geladen\
let app;\
document.addEventListener('DOMContentLoaded', () => \{\
    app = new BruchverkaufApp();\
\});}