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
            const scannerContainer = document.getElementById('scanner-container');
            scannerContainer.innerHTML = ''; // Clear previous scanner instance
            
            // Create scanner UI elements
            const scannerElement = document.createElement('div');
            scannerElement.id = 'reader';
            scannerElement.style.width = '100%';
            scannerElement.style.maxWidth = '500px';
            scannerElement.style.margin = '0 auto';
            scannerElement.style.position = 'relative';
            
            const scanBox = document.createElement('div');
            scanBox.style.position = 'absolute';
            scanBox.style.top = '50%';
            scanBox.style.left = '50%';
            scanBox.style.transform = 'translate(-50%, -50%)';
            scanBox.style.width = '70%';
            scanBox.style.maxWidth = '300px';
            scanBox.style.height = '200px';
            scanBox.style.border = '4px solid var(--primary-color)';
            scanBox.style.borderRadius = '8px';
            scanBox.style.pointerEvents = 'none';
            scanBox.style.boxShadow = '0 0 0 100vmax rgba(0, 0, 0, 0.5)';
            
            scannerElement.appendChild(scanBox);
            scannerContainer.appendChild(scannerElement);
            
            this.html5QrCode = new Html5Qrcode("reader");
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true
            };

            const cameraConfig = { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            };

            await this.html5QrCode.start(
                cameraConfig,
                config,
                (decodedText) => this.onScanSuccess(decodedText),
                (errorMessage) => {
                    // Ignore certain error messages
                    if (errorMessage.includes('No MultiFormat Readers were able to detect the code')) {
                        return;
                    }
                    console.error('Scanner error:', errorMessage);
                }
            );

            // Show scanner controls
            const controls = document.createElement('div');
            controls.className = 'scanner-controls';
            controls.style.display = 'flex';
            controls.style.justifyContent = 'center';
            controls.style.gap = '1rem';
            controls.style.marginTop = '1rem';
            
            const torchButton = document.createElement('button');
            torchButton.className = 'btn secondary';
            torchButton.innerHTML = '🔦 Taschenlampe';
            torchButton.onclick = () => this.toggleTorch();
            
            const stopButton = document.createElement('button');
            stopButton.className = 'btn danger';
            stopButton.innerHTML = '❌ Beenden';
            stopButton.onclick = () => this.stopScanner();
            
            controls.appendChild(torchButton);
            controls.appendChild(stopButton);
            scannerContainer.appendChild(controls);
            
            // Show scan instructions
            const instructions = document.createElement('div');
            instructions.className = 'scan-instructions';
            instructions.style.textAlign = 'center';
            instructions.style.marginTop = '1rem';
            instructions.style.color = 'white';
            instructions.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
            instructions.innerHTML = 'Halten Sie den Barcode in den markierten Bereich';
            scannerContainer.appendChild(instructions);
            
            // Show scanner in full screen on mobile
            if (window.innerWidth <= 768) {
                scannerContainer.style.position = 'fixed';
                scannerContainer.style.top = '0';
                scannerContainer.style.left = '0';
                scannerContainer.style.right = '0';
                scannerContainer.style.bottom = '0';
                scannerContainer.style.backgroundColor = 'rgba(0,0,0,0.9)';
                scannerContainer.style.zIndex = '1000';
                scannerContainer.style.display = 'flex';
                scannerContainer.style.flexDirection = 'column';
                scannerContainer.style.justifyContent = 'center';
                scannerContainer.style.alignItems = 'center';
                
                // Add close button for mobile
                const closeButton = document.createElement('button');
                closeButton.className = 'btn danger';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '1rem';
                closeButton.style.right = '1rem';
                closeButton.style.zIndex = '1001';
                closeButton.innerHTML = '✕ Schließen';
                closeButton.onclick = () => {
                    this.stopScanner();
                    scannerContainer.style.display = 'none';
                };
                scannerContainer.appendChild(closeButton);
            }
            
            // Disable body scroll when scanner is active
            document.body.style.overflow = 'hidden';
            
        } catch (err) {
            console.error('Scanner error:', err);
            const errorMessage = this.getUserFriendlyErrorMessage(err);
            alert('Kamera konnte nicht gestartet werden: ' + errorMessage);
            this.showPage('dashboard');
        }
    }

    async stopScanner() {
        try {
            if (this.html5QrCode) {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
                this.html5QrCode = null;
                
                // Reset scanner container
                const scannerContainer = document.getElementById('scanner-container');
                if (scannerContainer) {
                    scannerContainer.style = ''; // Reset styles
                    scannerContainer.innerHTML = ''; // Clear content
                }
                
                // Re-enable body scroll
                document.body.style.overflow = '';
            }
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
    }

    async onScanSuccess(decodedText) {
        try {
            // Pause scanner temporarily
            if (this.html5QrCode) {
                await this.html5QrCode.pause();
            }

            const ean = decodedText.trim();
            
            // Show scanning feedback
            const feedback = document.createElement('div');
            feedback.className = 'scan-feedback';
            feedback.style.position = 'fixed';
            feedback.style.top = '20%';
            feedback.style.left = '50%';
            feedback.style.transform = 'translateX(-50%)';
            feedback.style.backgroundColor = 'rgba(0,0,0,0.8)';
            feedback.style.color: 'white';
            feedback.style.padding: '1rem 2rem';
            feedback.style.borderRadius = '8px';
            feedback.style.zIndex = '1001';
            feedback.style.display = 'flex';
            feedback.style.flexDirection = 'column';
            feedback.style.alignItems = 'center';
            feedback.style.gap = '0.5rem';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.style.border = '4px solid rgba(255,255,255,0.3)';
            spinner.style.borderRadius = '50%';
            spinner.style.borderTop = '4px solid white';
            spinner.style.width = '30px';
            spinner.style.height = '30px';
            spinner.style.animation = 'spin 1s linear infinite';
            
            feedback.appendChild(spinner);
            feedback.appendChild(document.createTextNode('Verarbeite Artikel...'));
            document.body.appendChild(feedback);
            
            try {
                const article = await db.getArticleByEAN(ean);
                
                if (article) {
                    // Article found - add to cart
                    this.addToCart(article);
                    this.showScanResult(`"${article.name}" wurde zum Warenkorb hinzugefügt`, false);
                    
                    // Show success feedback
                    feedback.innerHTML = '';
                    feedback.style.backgroundColor = 'rgba(16, 185, 129, 0.9)';
                    const checkmark = document.createElement('div');
                    checkmark.innerHTML = '✓';
                    checkmark.style.fontSize = '2rem';
                    checkmark.style.lineHeight = '1';
                    feedback.appendChild(checkmark);
                    feedback.appendChild(document.createTextNode('Erfolgreich gescannt'));
                } else {
                    // Article not found - offer to create it
                    this.showScanResult(`Artikel mit EAN ${ean} nicht gefunden`, true, ean);
                    
                    // Show not found feedback
                    feedback.innerHTML = '';
                    feedback.style.backgroundColor = 'rgba(245, 158, 11, 0.9)';
                    const questionMark = document.createElement('div');
                    questionMark.innerHTML = '?';
                    questionMark.style.fontSize = '2rem';
                    questionMark.style.lineHeight = '1';
                    feedback.appendChild(questionMark);
                    feedback.appendChild(document.createTextNode('Artikel nicht gefunden'));
                }
            } catch (error) {
                console.error('Error processing scan:', error);
                this.showScanResult('Fehler beim Verarbeiten des Scans', false);
                
                // Show error feedback
                feedback.innerHTML = '';
                feedback.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
                const errorIcon = document.createElement('div');
                errorIcon.innerHTML = '⚠️';
                errorIcon.style.fontSize = '2rem';
                errorIcon.style.lineHeight = '1';
                feedback.appendChild(errorIcon);
                feedback.appendChild(document.createTextNode('Fehler beim Scannen'));
            }
            
            // Remove feedback after delay
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.style.opacity = '0';
                    feedback.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        if (feedback.parentNode) {
                            document.body.removeChild(feedback);
                        }
                    }, 500);
                }
                
                // Resume scanning
                if (this.html5QrCode) {
                    this.html5QrCode.resume().catch(err => {
                        console.error('Error resuming scanner:', err);
                    });
                }
            }, 2000);
            
        } catch (err) {
            console.error('Error in onScanSuccess:', err);
            
            // Try to resume scanning even if there was an error
            if (this.html5QrCode) {
                this.html5QrCode.resume().catch(e => console.error('Error resuming after error:', e));
            }
        }
    }

    // ===== Utility Methods =====
    
    showFormError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('has-error');
            
            // Add error message if not already present
            if (!formGroup.querySelector('.error-message')) {
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = message;
                formGroup.appendChild(errorElement);
            }
        }
        
        // Focus the field with error
        field.focus();
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }
    
    initializeTooltips() {
        // Initialize any tooltips if needed
        // You can use a library like tippy.js or implement your own tooltips
    }
    
    async toggleTorch() {
        try {
            if (!this.html5QrCode) return;
            
            const torchEnabled = await this.html5QrCode.getState().then(state => 
                state && state.torchEnabled
            );
            
            if (torchEnabled) {
                await this.html5QrCode.turnFlashOff();
            } else {
                await this.html5QrCode.turnFlashOn();
            }
            
            // Toggle torch button icon
            const torchButton = document.querySelector('.scanner-controls .btn.secondary');
            if (torchButton) {
                torchButton.innerHTML = torchEnabled ? '🔦 Taschenlampe' : '💡 Taschenlampe';
            }
        } catch (err) {
            console.error('Error toggling torch:', err);
        }
    }
    
    getUserFriendlyErrorMessage(error) {
        const errorMessage = error.message || error.toString();
        
        if (errorMessage.includes('Permission denied') || 
            errorMessage.includes('permission') ||
            errorMessage.includes('NotAllowedError')) {
            return 'Zugriff auf die Kamera wurde verweigert. Bitte erlauben Sie den Kamerazugriff in den Browsereinstellungen.';
        }
        
        if (errorMessage.includes('no devices') || 
            errorMessage.includes('No video') ||
            errorMessage.includes('NotFoundError')) {
            return 'Keine Kamera gefunden. Stellen Sie sicher, dass eine Kamera angeschlossen ist.';
        }
        
        if (errorMessage.includes('Could not start video source')) {
            return 'Die Kamera konnte nicht gestartet werden. Möglicherweise wird sie bereits von einer anderen Anwendung verwendet.';
        }
        
        return 'Ein unerwarteter Fehler ist aufgetreten: ' + errorMessage;
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

    // ===== Article Management =====
    
    // Format price for display
    formatPrice(price) {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }
    
    // Format price for input (from display to number)
    parsePrice(priceStr) {
        // Replace comma with dot and parse as float
        return parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
    }
    
    // Initialize price input formatting
    initPriceInputs() {
        document.querySelectorAll('input[data-price-input]').forEach(input => {
            // Format on blur
            input.addEventListener('blur', (e) => {
                const value = e.target.value;
                if (value) {
                    const number = this.parsePrice(value);
                    if (!isNaN(number)) {
                        e.target.value = number.toFixed(2).replace('.', ',');
                    }
                }
            });
            
            // Allow only numbers, comma and dot
            input.addEventListener('keydown', (e) => {
                // Allow: backspace, delete, tab, escape, enter, comma, period
                if ([46, 8, 9, 27, 13, 110, 190, 188].includes(e.keyCode) ||
                    // Allow: Ctrl+A, Command+A
                    (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                    // Allow: Ctrl+C, Command+C
                    (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
                    // Allow: Ctrl+X, Command+X
                    (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
                    // Allow: home, end, left, right
                    (e.keyCode >= 35 && e.keyCode <= 39)) {
                    // Let it happen, don't do anything
                    return;
                }
                
                // Ensure that it is a number and stop the keypress if not
                if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            });
        });
    }
    
    // Article management
    async loadArticles(searchTerm = '') {
        try {
            const articles = await db.getAllArticles();
            const articlesListElement = document.getElementById('articles-list');
            articlesListElement.innerHTML = '<div class="loading-spinner"></div>';

            if (!articles || articles.length === 0) {
                articlesListElement.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>Keine Artikel gefunden</h3>
                        <p>Fügen Sie einen neuen Artikel hinzu, um zu beginnen.</p>
                        <button class="btn primary" onclick="app.showArticleModal()">
                            + Neuen Artikel anlegen
                        </button>
                    </div>`;
                return;
            }

            // Filter articles based on search term
            const filteredArticles = searchTerm 
                ? articles.filter(article => {
                    const search = searchTerm.toLowerCase();
                    return (
                        (article.name && article.name.toLowerCase().includes(search)) ||
                        (article.ean && article.ean.includes(searchTerm)) ||
                        (article.articleNumber && article.articleNumber.includes(searchTerm)) ||
                        (article.id && article.id.toString() === searchTerm)
                    );
                })
                : articles;
            
            if (filteredArticles.length === 0) {
                articlesListElement.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>Keine Treffer</h3>
                        <p>Es wurden keine Artikel gefunden, die zu Ihrer Suche passen.</p>
                        <button class="btn secondary" onclick="document.getElementById('article-search').value = ''; app.loadArticles('')">
                            Alle Artikel anzeigen
                        </button>
                    </div>`;
                return;
            }

        if (filteredArticles.length === 0) {
            articlesListElement.innerHTML = '<p class="empty-state">No matching articles found</p>';
            return;
        }

            // Render articles
            articlesListElement.innerHTML = `
                <div class="articles-header">
                    <div class="search-container">
                        <input type="text" 
                               id="article-search" 
                               class="form-control" 
                               placeholder="Artikel suchen..." 
                               value="${searchTerm || ''}"
                               oninput="app.loadArticles(this.value)">
                        <button class="btn primary" onclick="app.showArticleModal()">
                            + Neu
                        </button>
                    </div>
                </div>
                <div class="articles-grid">
                    ${filteredArticles.map(article => `
                        <div class="article-card">
                            <div class="article-card-content">
                                <div class="article-card-header">
                                    <h3 class="article-name">${article.name || 'Unbenannter Artikel'}</h3>
                                    <span class="article-price">${article.price ? article.price.toFixed(2) + ' €' : 'Kein Preis'}</span>
                                </div>
                                <div class="article-details">
                                    ${article.ean ? `<div class="detail"><span>EAN:</span> ${article.ean}</div>` : ''}
                                    ${article.articleNumber ? `<div class="detail"><span>Art.-Nr.:</span> ${article.articleNumber}</div>` : ''}
                                    ${article.unit ? `<div class="detail"><span>Einheit:</span> ${article.unit}</div>` : ''}
                                </div>
                            </div>
                            <div class="article-card-actions">
                                <button class="btn primary btn-sm" 
                                        onclick="app.addToCart(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                                    In den Warenkorb
                                </button>
                                <div class="action-buttons">
                                    <button class="btn-icon" 
                                            title="Bearbeiten"
                                            onclick="app.editArticle(${article.id})">
                                        ✏️
                                    </button>
                                    <button class="btn-icon danger" 
                                            title="Löschen"
                                            onclick="app.showDeleteConfirmation(${article.id}, '${(article.name || 'diesen Artikel').replace(/'/g, '\'')}')">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Initialize tooltips
            this.initializeTooltips();
            
        } catch (error) {
            console.error('Error loading articles:', error);
            const articlesListElement = document.getElementById('articles-list');
            articlesListElement.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Fehler beim Laden der Artikel</h3>
                    <p>${error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}</p>
                    <button class="btn secondary" onclick="app.loadArticles()">
                        Erneut versuchen
                    </button>
                </div>`;
        }
    }

    showArticleModal(article = null) {
        const modal = document.getElementById('article-modal');
        const form = document.getElementById('article-form');
        const titleElement = document.getElementById('article-modal-title');
        
        // Reset form and clear any previous validation errors
        form.reset();
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));
        
        if (article && typeof article === 'object') {
            // Edit mode
            titleElement.textContent = 'Artikel bearbeiten';
            document.getElementById('article-id').value = article.id || '';
            document.getElementById('article-ean').value = article.ean || '';
            document.getElementById('article-number').value = article.articleNumber || '';
            document.getElementById('article-name').value = article.name || '';
            document.getElementById('article-unit').value = article.unit || 'Stück';
            document.getElementById('article-price').value = article.price || '';
            document.getElementById('article-description').value = article.description || '';
            
            // Update save button text
            document.getElementById('save-article').textContent = 'Speichern';
        } else {
            // Add new article mode
            titleElement.textContent = 'Neuen Artikel anlegen';
            
            // Pre-fill EAN if provided as string
            if (typeof article === 'string') {
                document.getElementById('article-ean').value = article;
            }
            
            // Update save button text
            document.getElementById('save-article').textContent = 'Anlegen';
        }
        
        // Show the modal with animation
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('show');
            // Focus on the first input field
            const firstInput = form.querySelector('input:not([type="hidden"])');
            if (firstInput) firstInput.focus();
        }, 10);
    }

    hideArticleModal() {
        const modal = document.getElementById('article-modal');
        modal.classList.remove('show');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    async saveArticle(event) {
        event.preventDefault();
        
        const form = event.target;
        const id = form.querySelector('#article-id').value;
        const ean = form.querySelector('#article-ean').value.trim();
        const name = form.querySelector('#article-name').value.trim();
        const price = parseFloat(form.querySelector('#article-price').value.replace(',', '.'));
        
        // Clear previous validation errors
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));
        
        // Validate form
        let isValid = true;
        
        if (!name) {
            this.showFormError('article-name', 'Bitte geben Sie einen Namen ein');
            isValid = false;
        }
        
        if (isNaN(price) || price <= 0) {
            this.showFormError('article-price', 'Bitte geben Sie einen gültigen Preis ein');
            isValid = false;
        }
        
        if (!isValid) {
            return;
        }
        
        const article = {
            ean: ean,
            articleNumber: form.querySelector('#article-number').value.trim(),
            name: name,
            unit: form.querySelector('#article-unit').value || 'Stück',
            price: price,
            description: form.querySelector('#article-description').value.trim(),
            lastUpdated: new Date().toISOString()
        };
        
        const saveButton = form.querySelector('#save-article');
        const originalButtonText = saveButton.innerHTML;
        
        try {
            // Show loading state
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="button-spinner"></span> Speichern...';
            
            if (id) {
                // Update existing article
                await db.updateArticle(parseInt(id), article);
                this.showToast('Artikel erfolgreich aktualisiert', 'success');
            } else {
                // Add new article
                await db.addArticle(article);
                this.showToast('Artikel erfolgreich angelegt', 'success');
            }
            
            this.hideArticleModal();
            this.loadArticles();
            
        } catch (error) {
            console.error('Fehler beim Speichern des Artikels:', error);
            
            let errorMessage = 'Ein Fehler ist aufgetreten';
            if (error.message.includes('constraint')) {
                if (error.message.includes('ean')) {
                    errorMessage = 'Ein Artikel mit dieser EAN existiert bereits';
                    this.showFormError('article-ean', errorMessage);
                } else if (error.message.includes('articleNumber')) {
                    errorMessage = 'Ein Artikel mit dieser Artikelnummer existiert bereits';
                    this.showFormError('article-number', errorMessage);
                }
            } else {
                this.showToast(errorMessage + ': ' + (error.message || 'Unbekannter Fehler'), 'error');
            }
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonText;
        }
    }

    showDeleteConfirmation(id, articleName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Artikel löschen</h3>
                    </div>
                    <div class="modal-body">
                        <p>Sind Sie sicher, dass Sie den Artikel <strong>${articleName}</strong> löschen möchten?</p>
                        <p class="text-muted">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn secondary" onclick="this.closest('.modal-overlay').remove()">
                            Abbrechen
                        </button>
                        <button type="button" class="btn danger" onclick="app.deleteArticle(${id}, this)">
                            Löschen
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
    
    async deleteArticle(id, button) {
        if (!button) return;
        
        const modal = button.closest('.modal-overlay');
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<span class="button-spinner"></span> Wird gelöscht...';
            
            await db.deleteArticle(id);
            
            // Show success message
            this.showToast('Artikel erfolgreich gelöscht', 'success');
            
            // Close modal with animation
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
            
            // Reload articles
            this.loadArticles();
            
        } catch (error) {
            console.error('Fehler beim Löschen des Artikels:', error);
            
            // Reset button state
            button.disabled = false;
            button.innerHTML = originalText;
            
            // Show error message
            this.showToast('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'), 'error');
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
