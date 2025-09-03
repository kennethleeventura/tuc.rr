// TUC.rr Reviews Retriever - Frontend JavaScript
// Copyright 2025 - 2882 LLC

class TUCApp {
    constructor() {
        this.API_BASE_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api'
            : 'https://tuc.theunhappycustomer.com/api';
        
        this.stripe = Stripe('pk_live_51Q9sHSATKgEupd7URm9MjNLLDV8HJqWXJOWVmCRvhXqYXf7XmhSNqUUFPAKCfUBiSu5YtBs9R7Z6Gz9LlLgDdAT300N4zV9iUH');
        this.currentUser = null;
        this.currentSubscription = null;
        
        this.init();
    }

    init() {
        console.log('*TUC muttering* Initializing the disappointment interface...');
        
        // Check for existing authentication
        this.checkAuthToken();
        
        // Bind event listeners
        this.bindEventListeners();
        
        // Initialize UI state
        this.updateUIState();
        
        console.log('*TUC resigned* Application loaded. Ready for inevitable problems...');
    }

    bindEventListeners() {
        // Navigation buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showModal('login'));
        document.getElementById('signupBtn')?.addEventListener('click', () => this.showModal('signup'));
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('tryFreeBtn')?.addEventListener('click', () => this.showAnalysisSection());
        
        // Modal controls
        document.querySelector('.modal-close')?.addEventListener('click', () => this.hideModal());
        document.getElementById('authModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'authModal') this.hideModal();
        });
        
        // Auth form switching
        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signup');
        });
        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });
        
        // Form submissions
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupFormElement')?.addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('analysisForm')?.addEventListener('submit', (e) => this.handleAnalysis(e));
        
        // Pricing buttons
        document.querySelectorAll('.btn-pricing').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSubscription(e));
        });
        
        document.getElementById('upgradeBtn')?.addEventListener('click', () => this.showPricingSection());
    }

    checkAuthToken() {
        const token = localStorage.getItem('tuc_auth_token');
        if (token) {
            // Verify token is still valid
            this.verifyToken(token);
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.currentSubscription = data.subscription;
                this.updateUIState();
                this.loadUsageInfo();
            } else {
                localStorage.removeItem('tuc_auth_token');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('tuc_auth_token');
        }
    }

    updateUIState() {
        const isLoggedIn = !!this.currentUser;
        
        // Update navigation buttons
        document.getElementById('loginBtn').style.display = isLoggedIn ? 'none' : 'inline-block';
        document.getElementById('signupBtn').style.display = isLoggedIn ? 'none' : 'inline-block';
        document.getElementById('accountBtn').style.display = isLoggedIn ? 'inline-block' : 'none';
        document.getElementById('logoutBtn').style.display = isLoggedIn ? 'inline-block' : 'none';
        
        // Update main CTA
        const tryBtn = document.getElementById('tryFreeBtn');
        if (isLoggedIn) {
            tryBtn.textContent = 'Start Analysis';
            tryBtn.querySelector('.btn-subtext')?.remove();
        }
        
        // Show analysis section if logged in
        if (isLoggedIn) {
            this.showAnalysisSection();
        }
    }

    showModal(type) {
        console.log(`*TUC muttering* Opening ${type} modal... here we go again...`);
        
        const modal = document.getElementById('authModal');
        modal.style.display = 'flex';
        
        if (type === 'login') {
            this.switchAuthForm('login');
        } else if (type === 'signup') {
            this.switchAuthForm('signup');
        }
    }

    hideModal() {
        console.log('*TUC relieved* Closing modal... finally...');
        document.getElementById('authModal').style.display = 'none';
    }

    switchAuthForm(type) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (type === 'login') {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('*TUC skeptical* Attempting login... this better work...');
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('*TUC surprised* Login successful... unexpected...');
                localStorage.setItem('tuc_auth_token', data.token);
                this.currentUser = data.user;
                this.hideModal();
                this.updateUIState();
                this.loadUsageInfo();
                this.showNotification(data.message, 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('*typical* Login failed. Network issues, probably...', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        console.log('*TUC resigned* Processing registration... another new disappointment...');
        
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAccepted = document.getElementById('termsAccepted').checked;
        const privacyConsent = document.getElementById('privacyConsent').checked;
        
        // Validation
        if (password !== confirmPassword) {
            this.showNotification('*predictable* Passwords don\'t match. Try again...', 'error');
            return;
        }
        
        if (!termsAccepted || !privacyConsent) {
            this.showNotification('*legal* You need to accept the terms and privacy policy...', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    termsAccepted,
                    privacyConsent
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('*TUC surprised* Registration successful... welcome to the club...');
                localStorage.setItem('tuc_auth_token', data.token);
                this.currentUser = data.user;
                this.hideModal();
                this.updateUIState();
                this.loadUsageInfo();
                this.showNotification(data.message, 'success');
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('*typical* Registration failed. Technical difficulties...', 'error');
        }
    }

    logout() {
        console.log('*TUC understanding* Logging out... probably for the best...');
        
        localStorage.removeItem('tuc_auth_token');
        this.currentUser = null;
        this.currentSubscription = null;
        this.updateUIState();
        this.hideAnalysisSection();
        this.showNotification('*resigned* You\'ve been logged out. Until next time...', 'info');
    }

    showAnalysisSection() {
        document.getElementById('analysisSection').style.display = 'block';
        document.getElementById('analysisSection').scrollIntoView({ behavior: 'smooth' });
    }

    hideAnalysisSection() {
        document.getElementById('analysisSection').style.display = 'none';
    }

    showPricingSection() {
        document.getElementById('pricingSection').scrollIntoView({ behavior: 'smooth' });
    }

    async loadUsageInfo() {
        if (!this.currentUser) return;
        
        try {
            const token = localStorage.getItem('tuc_auth_token');
            const response = await fetch(`${this.API_BASE_URL}/subscription/usage`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentSubscription = data.subscription;
                this.updateUsageDisplay();
            }
        } catch (error) {
            console.error('Failed to load usage info:', error);
        }
    }

    updateUsageDisplay() {
        const usageText = document.getElementById('usageText');
        const upgradeBtn = document.getElementById('upgradeBtn');
        
        if (this.currentSubscription) {
            const remaining = this.currentSubscription.monthly_query_limit - this.currentSubscription.queries_used_current_period;
            usageText.textContent = `Queries remaining: ${remaining}/${this.currentSubscription.monthly_query_limit}`;
            
            if (remaining <= 0) {
                upgradeBtn.style.display = 'inline-block';
            }
        }
    }

    async handleAnalysis(e) {
        e.preventDefault();
        console.log('*TUC muttering* Starting analysis... preparing disappointment report...');
        
        const query = document.getElementById('queryInput').value.trim();
        const category = document.getElementById('categorySelect').value;
        
        if (!query || !category) {
            this.showNotification('*frustrated* I need both a search query and category...', 'error');
            return;
        }
        
        if (!this.currentUser) {
            this.showNotification('*suspicious* You need to login first...', 'error');
            this.showModal('login');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const token = localStorage.getItem('tuc_auth_token');
            const response = await fetch(`${this.API_BASE_URL}/reviews/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, category })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('*TUC surprised* Analysis completed... results are in...');
                this.displayResults(data);
                this.loadUsageInfo(); // Update usage after successful query
            } else {
                this.showNotification(data.message, 'error');
                
                if (data.error === 'usage_limit_exceeded') {
                    document.getElementById('upgradeBtn').style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('*dramatic* Analysis failed catastrophically...', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (show) {
            loadingState.style.display = 'block';
            resultsContainer.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
        }
    }

    displayResults(data) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        // Create results HTML
        const resultHTML = `
            <div class="result-item">
                <div class="result-header">
                    <div class="result-title">
                        Analysis Results - Query #${data.query_number}
                    </div>
                    <div class="customer-id">
                        Customer ID: ${data.customer_id}
                    </div>
                </div>
                <div class="result-content">
                    ${this.formatAnalysisText(data.analysis)}
                </div>
                <div class="result-footer">
                    <small>
                        <em>*TUC muttering*</em> Response time: ${data.usage?.response_time_ms || 'unknown'}ms | 
                        Tokens used: ${data.usage?.tokens_used || 'unknown'}
                    </small>
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML = resultHTML;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    formatAnalysisText(text) {
        // Convert markdown-like formatting to HTML
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/☹️/g, '<span class="frown-emoji">☹️</span>') // Frown emojis
            .replace(/\n\n/g, '</p><p>') // Paragraphs
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/^/, '<p>') // Start with paragraph
            .replace(/$/, '</p>'); // End with paragraph
    }

    async handleSubscription(e) {
        const plan = e.target.dataset.plan;
        
        if (plan === 'free') {
            this.showNotification('*obvious* You\'re already on the free plan...', 'info');
            return;
        }
        
        if (!this.currentUser) {
            this.showNotification('*suspicious* You need to login first...', 'error');
            this.showModal('login');
            return;
        }
        
        console.log(`*TUC resigned* Creating subscription for ${plan} plan...`);
        
        try {
            const token = localStorage.getItem('tuc_auth_token');
            const response = await fetch(`${this.API_BASE_URL}/subscription/create-checkout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tier: plan })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('*TUC muttering* Redirecting to Stripe checkout...');
                this.showNotification(data.message, 'info');
                
                // Redirect to Stripe Checkout
                window.location.href = data.checkoutUrl;
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            this.showNotification('*predictable* Payment system is acting up...', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideNotification(notification), 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification(notification);
        });
    }

    hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Add notification styles
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1001;
    min-width: 300px;
    max-width: 500px;
    background-color: var(--bg-card);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

.notification.show {
    transform: translateX(0);
}

.notification-info {
    border-left: 4px solid var(--primary-color);
}

.notification-success {
    border-left: 4px solid var(--success-color);
}

.notification-error {
    border-left: 4px solid var(--accent-color);
}

.notification-content {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-message {
    flex-grow: 1;
    color: var(--text-primary);
}

.notification-close {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0 0 0 1rem;
}

.notification-close:hover {
    color: var(--accent-color);
}

.frown-emoji {
    color: var(--frown-color);
    font-size: 1.2em;
}

@media (max-width: 768px) {
    .notification {
        top: 10px;
        right: 10px;
        left: 10px;
        min-width: auto;
        transform: translateY(-100%);
    }
    
    .notification.show {
        transform: translateY(0);
    }
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tucApp = new TUCApp();
    
    // Handle URL parameters (e.g., success from Stripe)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        // Handle successful subscription
        window.tucApp.showNotification(
            '*surprised* Payment processed successfully! Welcome to your upgraded disappointment experience...',
            'success'
        );
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Refresh user data
        setTimeout(() => {
            window.tucApp.loadUsageInfo();
        }, 2000);
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key closes modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('authModal');
        if (modal.style.display === 'flex') {
            window.tucApp.hideModal();
        }
    }
    
    // Ctrl/Cmd + / opens analysis
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (window.tucApp.currentUser) {
            document.getElementById('queryInput').focus();
        } else {
            window.tucApp.showModal('login');
        }
    }
});

console.log('*TUC voice* TUC.rr frontend loaded... probably about to disappoint someone...');