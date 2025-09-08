// TUC.rr Reviews Retriever - Frontend JavaScript
// Copyright 2025 - 2882 LLC

document.addEventListener('DOMContentLoaded', function() {
    console.log('*TUC muttering* Initializing the disappointment interface...');
    
    // Get DOM elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const modelSelect = document.getElementById('model-select');
    const modelDescription = document.getElementById('model-description');
    const subscriptionBadge = document.getElementById('subscription-badge');
    const loadingSection = document.getElementById('loading-section');
    const loadingText = document.getElementById('loading-text');
    const responseContent = document.getElementById('response-content');
    const welcomeMessage = document.getElementById('welcome-message');
    const authButton = document.getElementById('auth-button');
    const userInfo = document.getElementById('user-info');
    
    // Configuration
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : '/api';
    
    // Loading messages for variety
    const loadingMessages = [
        "Searching for honest, critical reviews...",
        "Analyzing consumer disappointments...",
        "Compiling structured review insights...",
        "Finding the most pessimistic opinions...",
        "Transforming complaints into actionable data...",
        "Scanning for authentic negative feedback...",
        "Processing unfiltered customer experiences...",
        "Generating brutally honest assessments..."
    ];
    
    let loadingInterval = null;
    let currentUser = null;
    
    // Initialize the app
    init();
    
    function init() {
        console.log('*TUC resigned* Application loaded. Ready for inevitable problems...');
        
        // Check for existing authentication
        checkAuthToken();
        
        // Load available models
        loadAvailableModels();
        
        // Bind event listeners
        bindEventListeners();
        
        // Show welcome message
        showWelcomeMessage();
    }
    
    function bindEventListeners() {
        // Search form submission
        searchButton?.addEventListener('click', handleSearch);
        searchInput?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Model selection
        modelSelect?.addEventListener('change', function() {
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            if (selectedOption) {
                const description = selectedOption.getAttribute('data-description') || 'Select a model to see description';
                const tier = selectedOption.getAttribute('data-tier') || 'free';
                modelDescription.textContent = description;
                subscriptionBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
            }
        });
        
        // Auth button
        authButton?.addEventListener('click', function() {
            if (currentUser) {
                logout();
            } else {
                showAuthForm();
            }
        });
    }
    
    function checkAuthToken() {
        const token = localStorage.getItem('tuc_auth_token');
        if (token) {
            // For now, just assume the token is valid
            // In production, you'd verify with the server
            updateAuthUI(true, 'Demo User');
        }
    }
    
    function updateAuthUI(isLoggedIn, username = '') {
        if (isLoggedIn) {
            currentUser = { username };
            authButton.textContent = 'Sign Out';
            userInfo.textContent = `Welcome, ${username}`;
            userInfo.style.display = 'inline';
        } else {
            currentUser = null;
            authButton.textContent = 'Sign In';
            userInfo.style.display = 'none';
        }
    }
    
    function logout() {
        localStorage.removeItem('tuc_auth_token');
        updateAuthUI(false);
    }
    
    function showAuthForm() {
        alert('Authentication functionality will be available in the full version. For now, you can use the search feature without signing in.');
    }
    
    async function loadAvailableModels() {
        try {
            // For demonstration, use static models
            const models = [
                {
                    id: 'gpt-3.5-turbo',
                    name: '🤖 GPT-3.5 Turbo',
                    description: 'Fast and efficient model for general review analysis',
                    tier: 'free'
                },
                {
                    id: 'gpt-4',
                    name: '🧠 GPT-4',
                    description: 'Advanced model for detailed review analysis and insights',
                    tier: 'plus'
                },
                {
                    id: 'gpt-4-turbo',
                    name: '⚡ GPT-4 Turbo',
                    description: 'Latest high-performance model for comprehensive analysis',
                    tier: 'max'
                }
            ];
            
            updateModelSelector(models, 'free');
        } catch (error) {
            console.error('Error loading models:', error);
            modelSelect.innerHTML = '<option value=\"gpt-3.5-turbo\">🤖 GPT-3.5 Turbo (Default)</option>';
        }
    }
    
    function updateModelSelector(models, subscription) {
        modelSelect.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.setAttribute('data-description', model.description);
            option.setAttribute('data-tier', model.tier);
            modelSelect.appendChild(option);
        });
        
        subscriptionBadge.textContent = subscription.charAt(0).toUpperCase() + subscription.slice(1);
        
        // Set initial model description
        if (models.length > 0) {
            modelDescription.textContent = models[0].description;
        }
    }
    
    function showWelcomeMessage() {
        welcomeMessage.style.display = 'block';
        responseContent.style.display = 'none';
    }
    
    function showResults(content) {
        welcomeMessage.style.display = 'none';
        responseContent.style.display = 'block';
        responseContent.innerHTML = formatMarkdown(content);
    }
    
    async function handleSearch() {
        const query = searchInput?.value?.trim();
        const selectedModel = modelSelect?.value;
        
        if (!query) {
            showResults(`
                <h2>Please enter a search query! 🤔</h2>
                <p>I need something to search for before I can help you find reviews.</p>
                <h3>Try these examples:</h3>
                <ul>
                    <li>"Reviews for AirPods Pro 2nd generation"</li>
                    <li>"What are customers saying about Tesla Model Y?"</li>
                    <li>"Negative feedback on Windows 11"</li>
                    <li>"Consumer complaints about Amazon Prime"</li>
                </ul>
                <p><em>What would you like me to analyze?</em></p>
            `);
            return;
        }
        
        // Show loading state
        showLoading();
        searchButton.disabled = true;
        
        try {
            // For demo purposes, simulate API call
            const response = await simulateAPICall(query, selectedModel);
            
            // Hide loading state
            hideLoading();
            searchButton.disabled = false;
            
            // Display results
            showResults(response);
            
            // Scroll to results
            document.getElementById('results-section').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
        } catch (error) {
            console.error('Error:', error);
            
            // Hide loading state
            hideLoading();
            searchButton.disabled = false;
            
            // Display error message
            showResults(`
                <h2>Oops! Something went wrong 😅</h2>
                <p>I encountered a technical issue while searching for reviews. This could be due to:</p>
                <ul>
                    <li><strong>Network connectivity issues</strong></li>
                    <li><strong>Server maintenance</strong></li>
                    <li><strong>API rate limits</strong></li>
                    <li><strong>Unexpected system errors</strong></li>
                </ul>
                <h3>What you can do:</h3>
                <ul>
                    <li>Check your internet connection</li>
                    <li>Wait a moment and try again</li>
                    <li>Try a different search query</li>
                    <li>Contact support if the issue persists</li>
                </ul>
                <p><em>Don't worry - even I get disappointed sometimes! Let's try again.</em> 🔄</p>
            `);
        }
    }
    
    function showLoading() {
        loadingSection.style.display = 'block';
        
        // Start rotating loading messages
        let messageIndex = 0;
        loadingText.textContent = loadingMessages[messageIndex];
        loadingInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            loadingText.textContent = loadingMessages[messageIndex];
        }, 2000);
    }
    
    function hideLoading() {
        loadingSection.style.display = 'none';
        if (loadingInterval) {
            clearInterval(loadingInterval);
            loadingInterval = null;
        }
    }
    
    // Simulate API call for demonstration
    async function simulateAPICall(query, model) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
        return `
            <h2>*adjusts glasses pessimistically* Here's what I found about "${query}"... 😞</h2>
            
            <p><em>*sigh* As expected, it's not all sunshine and rainbows. Here's my brutally honest analysis:</em></p>
            
            <h3>🎯 Overall Disappointment Rating: ☹️☹️☹️ (3 out of 5 frowns)</h3>
            
            <h3>📊 What Real Customers Are Actually Saying:</h3>
            <ul>
                <li><strong>Common Complaints:</strong> Users frequently mention issues with build quality, customer service responsiveness, and value for money.</li>
                <li><strong>Recurring Problems:</strong> Multiple reports of functionality issues after extended use and difficulty with warranty claims.</li>
                <li><strong>Hidden Costs:</strong> Several reviews mention unexpected additional fees and subscription requirements not clearly disclosed upfront.</li>
            </ul>
            
            <h3>🔍 Critical Analysis:</h3>
            <p>Based on my pessimistic review analysis using ${model || 'GPT-3.5 Turbo'}, this product shows typical patterns of overpromising and underdelivering. While marketing materials paint a rosy picture, actual user experiences reveal a more sobering reality.</p>
            
            <h3>⚠️ Red Flags to Consider:</h3>
            <ul>
                <li>Inconsistent quality control across production batches</li>
                <li>Customer service response times averaging 5-7 business days</li>
                <li>Return policy restrictions not clearly mentioned in initial product descriptions</li>
            </ul>
            
            <h3>💡 TUC's Brutally Honest Recommendation:</h3>
            <p><strong>*resigned sigh*</strong> Look, I hate to be the bearer of bad news, but you should probably manage your expectations here. While some users have positive experiences, the pattern of complaints suggests you might want to consider alternatives or at least go in with realistic expectations.</p>
            
            <p><em>*muttering* Why does everything have to be so disappointing? At least you're getting an honest assessment...</em></p>
            
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 0.9em; color: #6b7280;"><strong>Demo Note:</strong> This is a simulated response for demonstration purposes. The full TUC.RR platform would provide real-time analysis of actual customer reviews from multiple sources.</p>
        `;
    }
    
    function formatMarkdown(text) {
        if (!text) return '';
        
        // Simple markdown-to-HTML conversion
        let formatted = text;
        
        // Headers
        formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Lists
        formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Paragraphs
        const lines = formatted.split('\\n\\n');
        formatted = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('<')) {
                return `<p>${trimmed}</p>`;
            }
            return trimmed;
        }).join('\\n');
        
        return formatted;
    }
    
    console.log('*TUC resigned* Everything is set up... probably about to break any minute now...');
});