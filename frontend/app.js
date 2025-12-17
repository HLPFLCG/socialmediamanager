<content>class HLPFLSocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.apiBaseUrl = window.location.origin;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        
        // Handle OAuth callback
        this.handleOAuthCallback();
        
        if (this.currentUser) {
            await this.loadDashboard();
            await this.loadSocialAccounts();
        } else {
            this.showAuthModal();
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                const isRegister = e.target.getAttribute('data-tab') === 'register';
                document.getElementById('nameGroup').style.display = isRegister ? 'block' : 'none';
                document.getElementById('authSubmit').textContent = isRegister ? 'Register' : 'Login';
            });
        });

        // Auth form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }

        // Post form
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createPost();
            });
        }

        // Platform checkboxes
        document.querySelectorAll('.platform-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const platform = e.target.value;
                if (e.target.checked) {
                    this.selectedPlatforms.push(platform);
                } else {
                    this.selectedPlatforms = this.selectedPlatforms.filter(p => p !== platform);
                }
                this.updateCharacterCount();
            });
        });

        // Character count
        const postContent = document.getElementById('postContent');
        if (postContent) {
            postContent.addEventListener('input', () => this.updateCharacterCount());
        }
    }

    async checkAuth() {
        if (!this.token) return false;
        
        try {
            const response = await this.apiCall('/api/user/profile');
            if (response.user) {
                this.currentUser = response.user;
                this.showUserInterface();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
            return false;
        }
    }

    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const error = urlParams.get('error');
        const success = urlParams.get('success');

        if (connected && success === 'true') {
            this.showNotification(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`, 'success');
            this.loadSocialAccounts();
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            const message = urlParams.get('message') || 'Authentication failed';
            this.showNotification(`Failed to connect: ${message}`, 'error');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    showAuthModal() {
        const authModal = document.getElementById('authModal');
        const appContainer = document.getElementById('appContainer');
        if (authModal) authModal.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }

    hideAuthModal() {
        const authModal = document.getElementById('authModal');
        const appContainer = document.getElementById('appContainer');
        if (authModal) authModal.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
    }

    async handleAuth() {
        const form = document.getElementById('authForm');
        const formData = new FormData(form);
        const isRegister = document.querySelector('.auth-tab.active').getAttribute('data-tab') === 'register';
        const authData = {
            email: formData.get('email'),
            password: formData.get('password'),
            name: formData.get('name') || undefined
        };

        try {
            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const response = await this.apiCall(endpoint, 'POST', authData);
            
            if (response.success) {
                this.token = response.token;
                this.currentUser = response.user;
                localStorage.setItem('token', this.token);
                this.hideAuthModal();
                this.showUserInterface();
                await this.loadDashboard();
                await this.loadSocialAccounts();
                this.showNotification(`Welcome${isRegister ? '! Your account has been created' : ' back'}!`, 'success');
            } else {
                this.showNotification(response.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            this.showNotification('Authentication failed: ' + error.message, 'error');
        }
    }

    showUserInterface() {
        this.hideAuthModal();
        
        // Update user info in sidebar
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.currentUser) {
            userInfo.innerHTML = `
                <div class="user-avatar">
                    <img src="${this.currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=random`}" 
                         alt="${this.currentUser.name}" 
                         class="avatar-img">
                </div>
                <div class="user-details">
                    <span class="user-name">${this.currentUser.name}</span>
                    <span class="user-email">${this.currentUser.email}</span>
                </div>
            `;
        }
    }

    async loadDashboard() {
        if (!this.currentUser) return;
        
        try {
            const response = await this.apiCall('/api/dashboard/stats');
            this.updateDashboardStats(response.stats);
            this.updateRecentPosts(response.recentPosts);
            this.updateConnectedAccounts(response.socialAccounts);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    updateDashboardStats(data) {
        if (!data) return;
        
        const elements = {
            totalPosts: document.getElementById('totalPosts'),
            publishedPosts: document.getElementById('publishedPosts'),
            scheduledPosts: document.getElementById('scheduledPosts'),
            reach: document.getElementById('reach')
        };
        
        Object.keys(elements).forEach(key => {
            if (elements[key] && data[key] !== undefined) {
                elements[key].textContent = data[key].toLocaleString();
            }
        });
    }

    updateRecentPosts(posts) {
        const postsContainer = document.getElementById('recentPosts');
        if (!postsContainer || !Array.isArray(posts)) return;
        
        if (posts.length === 0) {
            postsContainer.innerHTML = '<p>No posts yet. Create your first post!</p>';
            return;
        }
        
        postsContainer.innerHTML = posts.map(post => `
            <div style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem;">
                <p>${this.truncateText(post.content, 100)}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    ${post.platforms.map(platform => `
                        <span style="background: var(--primary); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem;">
                            ${platform}
                        </span>
                    `).join('')}
                </div>
                <small style="color: var(--secondary); margin-top: 0.5rem; display: block;">
                    ${new Date(post.created_at).toLocaleDateString()}
                </small>
            </div>
        `).join('');
    }

    updateConnectedAccounts(accounts) {
        const accountsContainer = document.getElementById('connectedAccounts');
        if (!accountsContainer) return;
        
        if (!Array.isArray(accounts) || accounts.length === 0) {
            accountsContainer.innerHTML = '<p>No connected accounts. Connect your social media accounts to start posting!</p>';
            return;
        }
        
        accountsContainer.innerHTML = accounts.map(account => `
            <div style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fab fa-${account.platform}" style="font-size: 1.5rem;"></i>
                    <span>${account.username || account.platform}</span>
                </div>
                <span style="background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem;">
                    Connected
                </span>
            </div>
        `).join('');
    }

    async createPost() {
        if (!this.currentUser || this.selectedPlatforms.length === 0) {
            this.showNotification('Please select at least one platform', 'error');
            return;
        }

        const content = document.getElementById('postContent').value;
        if (!content.trim()) {
            this.showNotification('Please enter post content', 'error');
            return;
        }

        try {
            const postData = {
                content: content.trim(),
                platforms: this.selectedPlatforms,
                media_urls: this.uploadedMedia
            };
            
            const response = await this.apiCall('/api/posts', 'POST', postData);
            
            if (response.success) {
                this.showNotification('Post created successfully!', 'success');
                this.clearPostForm();
                await this.loadDashboard();
            } else {
                this.showNotification(response.error || 'Failed to create post', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to create post: ' + error.message, 'error');
        }
    }

    clearPostForm() {
        document.getElementById('postContent').value = '';
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        this.updateCharacterCount();
    }

    updateCharacterCount() {
        const content = document.getElementById('postContent').value || '';
        const count = content.length;
        const countElement = document.getElementById('characterCount');
        if (countElement) {
            countElement.textContent = `${count} characters`;
        }
    }

    navigateToSection(section) {
        document.querySelectorAll('.main-section').forEach(s => {
            s.style.display = 'none';
        });
        
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${section}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const options = { method, headers: {} };
        
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }
        
        return responseData;
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.showAuthModal();
    }
}

// Global OAuth functions
async function connectSocialAccount(platform) {
    try {
        // Show loading state
        const button = document.querySelector(`.btn-connect[data-platform="${platform}"]`);
        if (!button) {
            console.error(`Connect button for ${platform} not found`);
            return;
        }
        
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        button.disabled = true;

        // Get current user
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id && socialMediaManager.currentUser) {
            user.id = socialMediaManager.currentUser.id;
        }
        
        // Initiate OAuth flow with user_id
        const baseUrl = window.location.origin;
        const authUrl = `${baseUrl}/auth/${platform}/authorize?user_id=${user.id}`;
        
        // Open OAuth popup
        const popup = window.open(authUrl, '_blank', 'width=600,height=600');
        
        // Listen for popup closure
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                button.innerHTML = originalText;
                button.disabled = false;
                socialMediaManager.showNotification('Authentication was cancelled', 'info');
            }
        }, 1000);

    } catch (error) {
        console.error('Connection error:', error);
        socialMediaManager.showNotification('Failed to connect account. Please try again.', 'error');
        
        // Reset button
        const button = document.querySelector(`.btn-connect[data-platform="${platform}"]`);
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

async function disconnectSocialAccount(platform) {
    try {
        if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
            return;
        }

        const response = await fetch(`${window.location.origin}/api/social/accounts/${platform}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to disconnect account');
        }

        socialMediaManager.showNotification('Account disconnected successfully', 'success');
        loadSocialAccounts();

    } catch (error) {
        console.error('Disconnection error:', error);
        socialMediaManager.showNotification('Failed to disconnect account', 'error');
    }
}

async function loadSocialAccounts() {
    try {
        // Show loading state
        document.querySelectorAll('.account-status').forEach(status => {
            status.textContent = 'Loading...';
        });
        document.querySelectorAll('.connection-info').forEach(info => {
            info.innerHTML = '<div class="oauth-loading"><i class="fas fa-spinner fa-spin"></i><span>Loading...</span></div>';
        });

        // Load actual connected accounts from API
        const response = await fetch(`${window.location.origin}/api/social/accounts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load accounts');
        }

        const data = await response.json();
        const accounts = data.accounts || [];
        updateAccountCards(accounts);

    } catch (error) {
        console.error('Failed to load accounts:', error);
        updateAccountCards([]);
    }
}

function updateAccountCards(accounts) {
    const platforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
    
    platforms.forEach(platform => {
        const card = document.querySelector(`.account-card[data-platform="${platform}"]`);
        if (!card) return;
        
        const statusElement = card.querySelector('.account-status');
        const buttonElement = card.querySelector('.btn-connect');
        const connectionInfoElement = card.querySelector('.connection-info');
        
        const isConnected = accounts.some(account => account.platform === platform);
        
        if (isConnected) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'account-status connected';
            
            buttonElement.innerHTML = '<i class="fas fa-unlink"></i> Disconnect';
            buttonElement.className = 'btn-connect btn-danger';
            buttonElement.onclick = () => disconnectSocialAccount(platform);
            
            const account = accounts.find(acc => acc.platform === platform);
            connectionInfoElement.innerHTML = `
                <div class="account-details">
                    <p><strong>Account ID:</strong> ${account.platform_user_id}</p>
                    <p><strong>Connected:</strong> ${new Date(account.created_at).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            statusElement.textContent = 'Not connected';
            statusElement.className = 'account-status disconnected';
            
            buttonElement.innerHTML = '<i class="fas fa-link"></i> Connect';
            buttonElement.className = 'btn-connect btn-outline';
            buttonElement.onclick = () => connectSocialAccount(platform);
            
            connectionInfoElement.innerHTML = `
                <div class="empty-connection">
                    <p>Connect your ${platform} account to start posting</p>
                </div>
            `;
        }
    });
}

// Initialize the app
let socialMediaManager;
document.addEventListener('DOMContentLoaded', () => {
    socialMediaManager = new HLPFLSocialMediaManager();
});

// Make functions globally available
window.connectSocialAccount = connectSocialAccount;
window.disconnectSocialAccount = disconnectSocialAccount;
window.loadSocialAccounts = loadSocialAccounts;
</content>