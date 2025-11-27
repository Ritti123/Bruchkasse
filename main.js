class BruchverkaufApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.cart = [];
        this.html5QrCode = null;
        this.init();
    }

    async init() {
        // Initialize database
        await db.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load the dashboard
        this.showPage('dashboard');
        
        // Register service worker
        this.registerServiceWorker();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showPage('dashboard'));
        });

        // Main navigation buttons
        document.getElementById('scan-btn').addEventListener('click', () => this.showPage('scanner'));
        document.getElementById('cart-btn').addEventListener('click', () => this.showPage('cart'));
        document.getElementById('articles-btn').addEventListener('click', () => this.showPage('articles'));
        document.getElementById('sales-btn').addEventListener('click', () => this.showPage('sales'));
        document.getElementById('import-export-btn').addEventListener('click', () => this.showPage('import-export'));

        // Scanner controls
        document.getElementById('start-scan').addEventListener('click', () => this.startScanner());
        document.getElementById('stop-scan').addEventListener('click', () => this.stopScanner());

        // Article management
        document.getElementById('add-article-btn').addEventListener('click', () => this.showArticleModal());
        document.getElementById('article-search').addEventListener('input', (e) => this.searchArticles(e.target.value));
        document.getElementById('article-form').addEventListener('submit', (e) => this.saveArticle(e));
        document.getElementById('cancel-article').addEventListener('click', () => this.hideArticleModal());

        // Cart functionality
        document.getElementById('clear-cart').addEventListener('click', () => this.clearCart());
        document.getElementById('checkout-btn').addEventListener('click', () => this.showCheckoutModal());

        // Checkout process
        document.getElementById('checkout-form').addEventListener('submit', (e) => this.completeSale(e));
        document.getElementById('cancel-checkout').addEventListener('click', () => this.hideCheckoutModal());

        // Import/Export
        document.getElementById('export-articles-json').addEventListener('click', () => this.exportArticles('json'));
        document.getElementById('export-articles-csv').addEventListener('click', () => this.exportArticles('csv'));
        document.getElementById('export-sales').addEventListener('click', () => this.exportSales());
        document.getElementById('import-file').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('import-articles').addEventListener('click', () => this.importArticles());
    }

    // Navigation
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Special handling for specific pages
        switch(pageName) {
            case 'scanner':
                this.currentPage = 'scanner';
                break;
            case 'cart':
                this.currentPage = 'cart';
                this.updateCartDisplay();
                break;
            case 'articles':
                this.currentPage = 'articles';
                this.loadArticles();
                break;
            case 'sales':
                this.currentPage = 'sales';
                this.loadSales();
                break;
            case 'import-export':
                this.currentPage = 'import-export';
                break;
            default:
                this.currentPage = 'dashboard';
                if (this.html5QrCode) {
                    this.stopScanner();
                }
        }

        // Show the selected page
        document.getElementById(pageName).classList.add('active');
    }

    // Scanner functions
    async startScanner() {
        try {
            this.html5QrCode = new Html5Qrcode("reader");
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 150 }
            };

            await this.html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.onScanSuccess(decodedText),
                (errorMessage) => {} // Ignore errors
            );

            document.getElementById('start-scan').disabled = true;
            document.getElementById('stop-scan').disabled = false;
        } catch (err) {
            alert('Could not start camera: ' + err);
        }
    }

    async stopScanner() {
        if (this.html5QrCode) {
            await this.html5QrCode.stop();
            this.html5QrCode.clear();
            this.html5QrCode = null;
            
            document.getElementById('start-scan').disabled = false;
            document.getElementById('stop-scan').disabled = true;
            document.getElementById('scan-result').classList.add('hidden');
        }
    }

    async onScanSuccess(decodedText) {
        // Pause scanner temporarily
        if (this.html5QrCode) {
            await this.html5QrCode.pause();
        }

        const ean = decodedText.trim();
        const article = await db.getArticleByEAN(ean);

        if (article) {
            // Article found - add to cart
            this.addToCart(article);
            this.showScanResult(`Added "${article.name}" to cart`, false);
        } else {
            // Article not found - offer to create it
            this.showScanResult(`Article with EAN ${ean} not found`, true, ean);
        }

        // Resume scanning after 2 seconds
        setTimeout(async () => {
            if (this.html5QrCode) {
                await this.html5QrCode.resume();
            }
            document.getElementById('scan-result').classList.add('hidden');
        }, 2000);
    }

    showScanResult(message, showCreateButton = false, ean = '') {
        const resultElement = document.getElementById('scan-result');
        const textElement = document.getElementById('scan-result-text');
        const actionsElement = document.getElementById('scan-result-actions');

        textElement.textContent = message;
        actionsElement.innerHTML = '';

        if (showCreateButton) {
            const createBtn = document.createElement('button');
            createBtn.className = 'btn primary';
            createBtn.textContent = 'Create Article';
            createBtn.addEventListener('click', () => {
                this.showArticleModal(ean);
                document.getElementById('scan-result').classList.add('hidden');
            });
            actionsElement.appendChild(createBtn);
        }

        resultElement.classList.remove('hidden');
    }

    // Cart functions
    addToCart(article) {
        const existingItem = this.cart.find(item => item.id === article.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...article,
                quantity: 1
            });
        }
        
        this.updateCartDisplay();
        this.showPage('cart');
    }

    removeFromCart(articleId) {
        this.cart = this.cart.filter(item => item.id !== articleId);
        this.updateCartDisplay();
    }

    updateCartItemQuantity(articleId, newQuantity) {
        const item = this.cart.find(item => item.id === articleId);
        if (item) {
            item.quantity = Math.max(1, parseInt(newQuantity) || 1);
            this.updateCartDisplay();
        }
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
    }

    updateCartDisplay() {
        const cartItemsElement = document.getElementById('cart-items');
        const subtotalElement = document.getElementById('subtotal');
        const totalElement = document.getElementById('total');
        const checkoutButton = document.getElementById('checkout-btn');

        if (this.cart.length === 0) {
            cartItemsElement.innerHTML = '<p class="empty-state">Cart is empty</p>';
            subtotalElement.textContent = '0,00 €';
            totalElement.textContent = '0,00 €';
            checkoutButton.disabled = true;
            return;
        }

        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal; // Add tax or other calculations here if needed

        // Update display
        subtotalElement.textContent = subtotal.toFixed(2) + ' €';
        totalElement.textContent = total.toFixed(2) + ' €';
        checkoutButton.disabled = false;

        // Render cart items
        cartItemsElement.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <p>${item.price.toFixed(2)} € × 
                    <input type="number" min="1" value="${item.quantity}" 
                           onchange="app.updateCartItemQuantity(${item.id}, this.value)">
                    ${item.unit}</p>
                </div>
                <div class="cart-item-price">
                    ${(item.price * item.quantity).toFixed(2)} €
                    <button class="btn-icon" onclick="app.removeFromCart(${item.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Article management
    async loadArticles(searchTerm = '') {
        const articles = await db.getAllArticles();
        const articlesListElement = document.getElementById('articles-list');

        if (!articles || articles.length === 0) {
            articlesListElement.innerHTML = '<p class="empty-state">No articles found</p>';
            return;
        }

        // Filter articles based on search term
        const filteredArticles = searchTerm 
            ? articles.filter(article => 
                article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (article.ean && article.ean.includes(searchTerm)) ||
                (article.articleNumber && article.articleNumber.includes(searchTerm))
              )
            : articles;

        if (filteredArticles.length === 0) {
            articlesListElement.innerHTML = '<p class="empty-state">No matching articles found</p>';
            return;
        }

        // Render articles
        articlesListElement.innerHTML = filteredArticles.map(article => `
            <div class="article-item">
                <div class="article-info">
                    <h3>${article.name}</h3>
                    <p>${article.ean} • ${article.price.toFixed(2)} €/${article.unit}</p>
                </div>
                <div class="article-actions">
                    <button class="btn secondary" onclick="app.addToCart(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                        Add to Cart
                    </button>
                    <button class="btn-icon" onclick="app.editArticle(${article.id})">
                        ✏️
                    </button>
                    <button class="btn-icon danger" onclick="app.deleteArticle(${article.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    showArticleModal(article = null) {
        const modal = document.getElementById('article-modal');
        const form = document.getElementById('article-form');
        const titleElement = document.getElementById('article-modal-title');
        
        if (article) {
            // Edit mode
            titleElement.textContent = 'Edit Article';
            document.getElementById('article-id').value = article.id || '';
            document.getElementById('article-ean').value = article.ean || '';
            document.getElementById('article-number').value = article.articleNumber || '';
            document.getElementById('article-name').value = article.name || '';
            document.getElementById('article-unit').value = article.unit || '';
            document.getElementById('article-price').value = article.price || '';
        } else {
            // Add new article mode
            titleElement.textContent = 'Add Article';
            form.reset();
            if (typeof article === 'string') {
                // Pre-fill EAN if provided as string
                document.getElementById('article-ean').value = article;
            }
        }
        
        modal.classList.remove('hidden');
    }

    hideArticleModal() {
        document.getElementById('article-modal').classList.add('hidden');
    }

    async saveArticle(event) {
        event.preventDefault();
        
        const form = event.target;
        const id = form.querySelector('#article-id').value;
        const article = {
            ean: form.querySelector('#article-ean').value,
            articleNumber: form.querySelector('#article-number').value,
            name: form.querySelector('#article-name').value,
            unit: form.querySelector('#article-unit').value,
            price: parseFloat(form.querySelector('#article-price').value)
        };

        try {
            if (id) {
                // Update existing article
                await db.updateArticle(parseInt(id), article);
            } else {
                // Add new article
                await db.addArticle(article);
            }
            
            this.hideArticleModal();
            this.loadArticles();
        } catch (error) {
            console.error('Error saving article:', error);
            alert('Error saving article: ' + error.message);
        }
    }

    async deleteArticle(id) {
        if (!confirm('Are you sure you want to delete this article?')) {
            return;
        }
        
        try {
            await db.deleteArticle(id);
            this.loadArticles();
        } catch (error) {
            console.error('Error deleting article:', error);
            alert('Error deleting article: ' + error.message);
        }
    }

    // Checkout process
    showCheckoutModal() {
        document.getElementById('checkout-modal').classList.remove('hidden');
    }

    hideCheckoutModal() {
        document.getElementById('checkout-modal').classList.add('hidden');
    }

    async completeSale(event) {
        event.preventDefault();
        
        const personalNumber = document.getElementById('personal-number').value.trim();
        if (!personalNumber) {
            alert('Please enter a personal number');
            return;
        }

        if (this.cart.length === 0) {
            alert('Cart is empty');
            return;
        }

        try {
            const sale = {
                items: [...this.cart],
                personalNumber,
                date: new Date().toISOString(),
                total: this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            await db.addSale(sale);
            
            // Clear cart and return to dashboard
            this.clearCart();
            this.hideCheckoutModal();
            this.showPage('dashboard');
            
            // Show success message
            alert('Sale completed successfully!');
        } catch (error) {
            console.error('Error completing sale:', error);
            alert('Error completing sale: ' + error.message);
        }
    }

    // Import/Export
    async exportArticles(format = 'json') {
        try {
            const articles = await db.exportArticles();
            let content, filename, mimeType;
            
            if (format === 'csv') {
                // Convert to CSV
                const headers = ['EAN', 'Article Number', 'Name', 'Unit', 'Price'];
                const rows = articles.map(article => [
                    `"${article.ean || ''}"`,
                    `"${article.articleNumber || ''}"`,
                    `"${article.name || ''}"`,
                    `"${article.unit || ''}"`,
                    article.price || '0.00'
                ].join(','));
                
                content = [headers.join(','), ...rows].join('\n');
                filename = `articles-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv;charset=utf-8;';
            } else {
                // Default to JSON
                content = JSON.stringify(articles, null, 2);
                filename = `articles-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json;charset=utf-8;';
            }
            
            // Create download link
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting articles:', error);
            alert('Error exporting articles: ' + error.message);
        }
    }

    async exportSales() {
        try {
            const sales = await db.exportSales();
            const content = JSON.stringify(sales, null, 2);
            const filename = `sales-${new Date().toISOString().split('T')[0]}.json`;
            
            // Create download link
            const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting sales:', error);
            alert('Error exporting sales: ' + error.message);
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let data;
                
                if (file.name.endsWith('.csv')) {
                    // Parse CSV
                    const lines = content.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    data = lines.slice(1)
                        .filter(line => line.trim() !== '')
                        .map(line => {
                            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                            return headers.reduce((obj, header, i) => {
                                obj[header] = values[i];
                                return obj;
                            }, {});
                        });
                } else {
                    // Parse JSON
                    data = JSON.parse(content);
                }
                
                // Enable import button and store data
                const importButton = document.getElementById('import-articles');
                importButton.disabled = false;
                importButton.dataset.importData = JSON.stringify(data);
                
            } catch (error) {
                console.error('Error parsing file:', error);
                alert('Error parsing file: ' + error.message);
            }
        };
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsText(file);
        }
    }

    async importArticles() {
        const importButton = document.getElementById('import-articles');
        const importMode = document.querySelector('input[name="import-mode"]:checked').value;
        
        try {
            const data = JSON.parse(importButton.dataset.importData);
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No valid data to import');
            }
            
            // Map and validate data
            const articles = data.map(item => ({
                ean: item.ean || '',
                articleNumber: item.articleNumber || item['Article Number'] || '',
                name: item.name || item.Name || '',
                unit: item.unit || item.Unit || 'Stk',
                price: parseFloat(item.price || item.Price || 0)
            }));
            
            // Import to database
            const count = await db.importArticles(articles, importMode);
            
            // Reset form and show success message
            document.getElementById('import-file').value = '';
            importButton.disabled = true;
            delete importButton.dataset.importData;
            
            // Reload articles
            this.loadArticles();
            
            alert(`Successfully imported ${count} articles`);
        } catch (error) {
            console.error('Error importing articles:', error);
            alert('Error importing articles: ' + error.message);
        }
    }

    // Sales history
    async loadSales() {
        const sales = await db.getAllSales();
        const salesListElement = document.getElementById('sales-list');

        if (!sales || sales.length === 0) {
            salesListElement.innerHTML = '<p class="empty-state">No sales history available</p>';
            return;
        }

        // Group sales by date
        const salesByDate = sales.reduce((groups, sale) => {
            const date = new Date(sale.date).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(sale);
            return groups;
        }, {});

        // Render sales by date
        salesListElement.innerHTML = Object.entries(salesByDate).map(([date, dailySales]) => `
            <div class="sales-day">
                <h3>${date}</h3>
                ${dailySales.map(sale => `
                    <div class="sale-item">
                        <div class="sale-header">
                            <span class="sale-time">${new Date(sale.date).toLocaleTimeString()}</span>
                            <span class="sale-total">${sale.total.toFixed(2)} €</span>
                        </div>
                        <div class="sale-details">
                            <p>Items: ${sale.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                            <p>Employee: ${sale.personalNumber}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('service-worker.js');
                console.log('ServiceWorker registration successful');
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BruchverkaufApp();
});
