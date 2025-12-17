// HLPFL Social Media Manager - Frontend Application
// API Configuration
const API_BASE_URL = 'https://socialmediamanager-api-production.hlpfl-co.workers.dev/api';

class SocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.scheduledPosts = [];
        this.connectedAccounts = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Check if user is already authenticated
        if (this.token) {
            const isValid = await this.checkAuth();
            if (isValid) {
                this.showApp();
                await this.loadDashboard();
            } else {
                this.showAuthModal();
            }
        } else {
            this.showAuthModal();
        }
    }

    setupEventListeners() {
        // Auth form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }

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

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
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

        // Post content
        const postContent = document.getElementById('postContent');
        if (postContent) {
            postContent.addEventListener('input', () => this.updateCharacterCount());
        }

        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Password change form
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }
    }

    async checkAuth() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await this.apiCall('/user/profile');
            if (response.user) {
                this.currentUser = response.user;
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

    showAuthModal() {
        const authModal = document.getElementById('authModal');
        const appContainer = document.getElementById('appContainer');
        
        if (authModal) authModal.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }

    showApp() {
        const authModal = document.getElementById('authModal');
        const appContainer = document.getElementById('appContainer');
        
        if (authModal) authModal.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';

        // Update user info
        if (this.currentUser) {
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.innerHTML = `
                    <div style="font-size: 0.875rem;">
                        <strong>${this.currentUser.name || 'User'}</strong><br>
                        <small>${this.currentUser.email}</small>
                    </div>
                `;
            }
        }
    }

    async handleAuth() {
        const form = document.getElementById('authForm');
        const formData = new FormData(form);
        const isRegister = document.querySelector('.auth-tab.active').getAttribute('data-tab') === 'register';

        const authData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        if (isRegister) {
            authData.name = formData.get('name') || authData.email.split('@')[0];
        }

        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const response = await this.apiCall(endpoint, 'POST', authData);

            if (response.success) {
                this.token = response.token;
                this.currentUser = response.user;
                localStorage.setItem('token', this.token);
                
                this.showApp();
                await this.loadDashboard();
                this.showNotification('Welcome back!', 'success');
            } else {
                this.showNotification(response.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showNotification('Authentication failed: ' + error.message, 'error');
        }
    }

    async loadDashboard() {
        if (!this.currentUser) return;

        try {
            const statsResponse = await this.apiCall('/dashboard/stats');
            this.updateDashboardStats(statsResponse);
            this.updateRecentPosts(statsResponse.recentPosts);
            this.updateConnectedAccounts(statsResponse.socialAccounts);
            this.loadConnectedAccounts();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    updateDashboardStats(data) {
        if (!data.stats) return;

        const elements = {
            totalPosts: document.getElementById('totalPosts'),
            publishedPosts: document.getElementById('publishedPosts'),
            scheduledPosts: document.getElementById('scheduledPosts'),
            reach: document.getElementById('reach')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key] && data.stats[key] !== undefined) {
                elements[key].textContent = data.stats[key].toLocaleString();
            }
        });
    }

    updateRecentPosts(posts) {
        const postsContainer = document.getElementById('recentPosts');
        if (!postsContainer || !Array.isArray(posts)) return;

        if (posts.length === 0) {
            postsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No posts yet</h3><p>Create your first post to get started!</p></div>';
            return;
        }

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-card">
                <p>${this.truncateText(post.content, 100)}</p>
                <div class="post-platforms">
                    ${post.platforms.map(platform => `
                        <span class="platform-badge">
                            <i class="fab fa-${platform}"></i> ${platform}
                        </span>
                    `).join('')}
                </div>
                <div class="post-meta">
                    <span class="post-status status-${post.status}">${post.status}</span>
                    <small>${new Date(post.created_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    updateConnectedAccounts(accounts) {
        const accountsContainer = document.getElementById('connectedAccounts');
        if (!accountsContainer) return;

        if (!Array.isArray(accounts) || accounts.length === 0) {
            accountsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-link"></i><h3>No connected accounts</h3><p>Connect your social media accounts to start posting!</p></div>';
            return;
        }

        accountsContainer.innerHTML = accounts.map(account => `
            <div class="account-card">
                <div class="account-info">
                    <i class="fab fa-${account.platform}" style="font-size: 1.5rem; color: var(--accent-orange);"></i>
                    <div>
                        <strong>${account.username || account.platform}</strong>
                        <small>${account.platform}</small>
                    </div>
                </div>
                <button class="btn" onclick="socialMediaManager.disconnectAccount(${account.id})">
                    <i class="fas fa-unlink"></i> Disconnect
                </button>
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

            const response = await this.apiCall('/posts', 'POST', postData);

            if (response.success) {
                this.showNotification('Post created successfully!', 'success');
                this.clearPostForm();
                await this.loadDashboard();
                this.navigateToSection('dashboard');
            } else {
                this.showNotification(response.error || 'Failed to create post', 'error');
            }
        } catch (error) {
            console.error('Create post error:', error);
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

    async loadAnalytics() {
        try {
            const response = await this.apiCall('/analytics');
            if (response.success) {
                this.displayAnalytics(response.analytics);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showNotification('Failed to load analytics', 'error');
        }
    }

    displayAnalytics(analytics) {
        const analyticsContainer = document.getElementById('analyticsContent');
        if (!analyticsContainer) return;

        analyticsContainer.innerHTML = `
            <div class="analytics-grid">
                <div class="stat-card">
                    <h3>Total Posts</h3>
                    <div class="stat-value">${analytics.totalPosts}</div>
                </div>
                <div class="stat-card">
                    <h3>Published</h3>
                    <div class="stat-value">${analytics.publishedPosts}</div>
                </div>
                <div class="stat-card">
                    <h3>Scheduled</h3>
                    <div class="stat-value">${analytics.scheduledPosts}</div>
                </div>
                <div class="stat-card">
                    <h3>Drafts</h3>
                    <div class="stat-value">${analytics.draftPosts}</div>
                </div>
            </div>
            
            <div class="analytics-section">
                <h3>Platform Breakdown</h3>
                <div class="platform-stats">
                    ${Object.entries(analytics.platformBreakdown).map(([platform, count]) => `
                        <div class="platform-stat">
                            <i class="fab fa-${platform}"></i>
                            <span>${platform}</span>
                            <strong>${count}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="analytics-section">
                <h3>Engagement Metrics</h3>
                <div class="engagement-grid">
                    <div class="metric-card">
                        <i class="fas fa-eye"></i>
                        <div>
                            <strong>${analytics.engagementMetrics.totalViews.toLocaleString()}</strong>
                            <span>Total Views</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <i class="fas fa-heart"></i>
                        <div>
                            <strong>${analytics.engagementMetrics.totalLikes.toLocaleString()}</strong>
                            <span>Total Likes</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <i class="fas fa-share"></i>
                        <div>
                            <strong>${analytics.engagementMetrics.totalShares.toLocaleString()}</strong>
                            <span>Total Shares</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <i class="fas fa-comment"></i>
                        <div>
                            <strong>${analytics.engagementMetrics.totalComments.toLocaleString()}</strong>
                            <span>Total Comments</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadScheduler() {
        try {
            const response = await this.apiCall('/posts/scheduled');
            if (response.success) {
                this.scheduledPosts = response.posts;
                this.displayScheduledPosts();
            }
        } catch (error) {
            console.error('Failed to load scheduled posts:', error);
            this.showNotification('Failed to load scheduled posts', 'error');
        }
    }

    displayScheduledPosts() {
        const schedulerContainer = document.getElementById('scheduledPostsList');
        if (!schedulerContainer) return;

        if (this.scheduledPosts.length === 0) {
            schedulerContainer.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><h3>No scheduled posts</h3><p>Schedule posts to publish them automatically!</p></div>';
            return;
        }

        schedulerContainer.innerHTML = this.scheduledPosts.map(post => `
            <div class="scheduled-post-card">
                <div class="post-content">
                    <p>${this.truncateText(post.content, 150)}</p>
                    <div class="post-platforms">
                        ${post.platforms.map(p => `<span class="platform-badge"><i class="fab fa-${p}"></i> ${p}</span>`).join('')}
                    </div>
                </div>
                <div class="post-schedule">
                    <div class="schedule-time">
                        <i class="fas fa-clock"></i>
                        <span>${new Date(post.scheduled_at).toLocaleString()}</span>
                    </div>
                    <div class="post-actions">
                        <button class="btn" onclick="socialMediaManager.editScheduledPost(${post.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn" onclick="socialMediaManager.cancelScheduledPost(${post.id})">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async cancelScheduledPost(postId) {
        if (!confirm('Are you sure you want to cancel this scheduled post?')) return;

        try {
            const response = await this.apiCall(`/posts/scheduled/${postId}`, 'DELETE');
            if (response.success) {
                this.showNotification('Scheduled post cancelled', 'success');
                await this.loadScheduler();
            }
        } catch (error) {
            console.error('Failed to cancel post:', error);
            this.showNotification('Failed to cancel post', 'error');
        }
    }

    async loadSettings() {
        try {
            const response = await this.apiCall('/user/settings');
            if (response.success) {
                this.displaySettings(response.settings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showNotification('Failed to load settings', 'error');
        }
    }

    displaySettings(settings) {
        const nameInput = document.getElementById('settingsName');
        const emailInput = document.getElementById('settingsEmail');
        
        if (nameInput) nameInput.value = settings.name || '';
        if (emailInput) emailInput.value = settings.email || '';
    }

    async saveSettings() {
        const name = document.getElementById('settingsName').value;
        
        try {
            const response = await this.apiCall('/user/settings', 'PUT', { name });
            if (response.success) {
                this.showNotification('Settings saved successfully', 'success');
                this.currentUser.name = name;
                this.showApp(); // Update user info display
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/user/change-password', 'POST', {
                currentPassword,
                newPassword
            });

            if (response.success) {
                this.showNotification('Password changed successfully', 'success');
                document.getElementById('passwordForm').reset();
            }
        } catch (error) {
            console.error('Failed to change password:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async disconnectAccount(accountId) {
        if (!confirm('Are you sure you want to disconnect this account?')) return;

        try {
            const response = await this.apiCall(`/social/accounts/${accountId}`, 'DELETE');
            if (response.success) {
                this.showNotification('Account disconnected', 'success');
                await this.loadDashboard();
            }
        } catch (error) {
            console.error('Failed to disconnect account:', error);
            this.showNotification('Failed to disconnect account', 'error');
        }
    }

    navigateToSection(section) {
        // Hide all sections
        document.querySelectorAll('.main-section').forEach(s => {
            s.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-section="${section}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Load section-specific data
        if (section === 'analytics') {
            this.loadAnalytics();
        } else if (section === 'scheduler') {
            this.loadScheduler();
        } else if (section === 'settings') {
            this.loadSettings();
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: {}
        };

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
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.showAuthModal();
        this.showNotification('Logged out successfully', 'info');
    }

    // OAuth Methods
    connectSocialAccount(platform) {
        const baseUrl = window.location.origin;
        const authUrl = `${baseUrl}/auth/${platform}/authorize`;
        window.open(authUrl, '_blank', 'width=600,height=600');
    }

    async loadConnectedAccounts() {
        try {
            const response = await this.apiCall('/social/accounts');
            this.connectedAccounts = response.accounts || [];
            this.updateConnectedAccountsUI();
        } catch (error) {
            console.error('Failed to load connected accounts:', error);
        }
    }

    updateConnectedAccountsUI() {
        const accountsContainer = document.getElementById('connectedAccounts');
        if (!accountsContainer) return;

        const platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube', 'pinterest'];
        
        let html = '<div class="social-accounts-grid">';
        
        platforms.forEach(platform => {
            const isConnected = this.connectedAccounts.some(acc => acc.platform === platform);
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            const iconClass = this.getPlatformIcon(platform);
            
            html += `
                <div class="social-account-card ${isConnected ? 'connected' : ''}">
                    <div class="account-info">
                        <i class="${iconClass}"></i>
                        <span>${platformName}</span>
                    </div>
                    <div class="account-actions">
                        ${isConnected 
                            ? `<button class="btn btn-small btn-danger" onclick="socialMediaManager.disconnectAccount('${platform}')">Disconnect</button>`
                            : `<button class="btn btn-small btn-primary" onclick="socialMediaManager.connectSocialAccount('${platform}')">Connect</button>`
                        }
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        accountsContainer.innerHTML = html;
    }

    getPlatformIcon(platform) {
        const icons = {
            twitter: 'fab fa-twitter',
            linkedin: 'fab fa-linkedin',
            facebook: 'fab fa-facebook',
            instagram: 'fab fa-instagram',
            tiktok: 'fab fa-tiktok',
            youtube: 'fab fa-youtube',
            pinterest: 'fab fa-pinterest'
        };
        return icons[platform] || 'fas fa-share-alt';
    }

    async disconnectAccount(platform) {
        if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
            return;
        }

        try {
            const response = await this.apiCall(`/social/accounts/${platform}`, 'DELETE');
            if (response.success) {
                this.showNotification(`${platform} account disconnected`, 'success');
                await this.loadConnectedAccounts();
            }
        } catch (error) {
            this.showNotification(`Failed to disconnect ${platform}`, 'error');
        }
    }
}

// Initialize the application when DOM is ready
let socialMediaManager;
document.addEventListener('DOMContentLoaded', () => {
    socialMediaManager = new SocialMediaManager();
});
// Social Accounts Management
function initializeSocialAccounts() {
    // Add event listeners to connect buttons
    document.querySelectorAll('.btn-connect').forEach(button => {
        button.addEventListener('click', async (e) => {
            const platform = e.currentTarget.dataset.platform;
            await connectSocialAccount(platform);
        });
    });

    // Add event listeners to disconnect buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-disconnect')) {
            const platform = e.target.dataset.platform;
            await disconnectSocialAccount(platform);
        }
    });

    // Load accounts on page load
    loadSocialAccounts();
}

async function loadSocialAccounts() {
    // Show loading state
    document.querySelectorAll('.account-status').forEach(status => {
        status.textContent = 'Loading...';
    });
    document.querySelectorAll('.connection-info').forEach(info => {
        info.innerHTML = '<div class="oauth-loading"><i class="fas fa-spinner fa-spin"></i><span>Loading...</span></div>';
    });

    try {
        // Load actual connected accounts from API
        const response = await fetch(`${API_BASE_URL}/api/social/accounts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load accounts');
        }

        const accounts = await response.json();
        updateAccountCards(accounts);

    } catch (error) {
        console.error('Failed to load accounts:', error);
        // Reset to disconnected state
        updateAccountCards([]);
    }
}

function updateAccountCards(accounts) {
    // Reset all cards to disconnected state first
    document.querySelectorAll('.account-card').forEach(card => {
        const platform = card.dataset.platform;
        const statusElement = card.querySelector('.account-status');
        const button = card.querySelector('.btn-connect, .btn-disconnect');
        const connectionInfo = card.querySelector('.connection-info');
        
        statusElement.textContent = 'Not connected';
        statusElement.className = 'account-status';
        button.innerHTML = '<i class="fas fa-plus"></i> Connect';
        button.classList.remove('btn-disconnect');
        button.classList.add('btn-connect', 'btn-outline');
        button.dataset.platform = platform;
        connectionInfo.innerHTML = '<span class="no-accounts">No accounts connected</span>';
    });

    // Update cards with connected accounts
    accounts.forEach(account => {
        const card = document.querySelector(`.account-card[data-platform="${account.platform}"]`);
        if (!card) return;

        const statusElement = card.querySelector('.account-status');
        const button = card.querySelector('.btn-connect, .btn-disconnect');
        const connectionInfo = card.querySelector('.connection-info');
        
        statusElement.textContent = 'Connected';
        statusElement.className = 'account-status connected';
        button.innerHTML = '<i class="fas fa-times"></i> Disconnect';
        button.classList.remove('btn-connect', 'btn-outline');
        button.classList.add('btn-disconnect');
        button.dataset.platform = account.platform;
        
        connectionInfo.innerHTML = `
            <div class="connected-account">
                <div class="account-user">
                    <strong>${account.username || account.display_name || 'Account'}</strong>
                    <span class="account-id">ID: ${account.platform_user_id}</span>
                </div>
                <div class="account-stats">
                    <span>Connected: ${new Date(account.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    });
}

async function connectSocialAccount(platform) {
    try {
        // Show loading state
        const button = document.querySelector(`.btn-connect[data-platform="${platform}"]`);
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        button.disabled = true;

        // Get current user
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Initiate OAuth flow
        const response = await fetch(`${API_BASE_URL}/oauth/${platform}/authorize?user_id=${user.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to initiate OAuth flow');
        }

        const data = await response.json();
        
        // Redirect to OAuth provider
        if (data.authorization_url) {
            window.location.href = data.authorization_url;
        } else {
            throw new Error('No authorization URL received');
        }

    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Failed to connect account. Please try again.', 'error');
        
        // Reset button
        const button = document.querySelector(`.btn-connect[data-platform="${platform}"]`);
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function disconnectSocialAccount(platform) {
    try {
        if (!confirm('Are you sure you want to disconnect this account?')) {
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/social/accounts/${platform}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to disconnect account');
        }

        showNotification('Account disconnected successfully', 'success');
        loadSocialAccounts(); // Refresh the accounts list

    } catch (error) {
        console.error('Disconnection error:', error);
        showNotification('Failed to disconnect account', 'error');
    }
}

// Handle OAuth callback
function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const platform = urlParams.get('platform');
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (platform && (code || error)) {
        if (error) {
            console.error('OAuth error:', error);
            showNotification('Authentication failed', 'error');
            return;
        }

        // Exchange code for token
        exchangeCodeForToken(platform, code, state);
    }
}

async function exchangeCodeForToken(platform, code, state) {
    try {
        const response = await fetch(`${API_BASE_URL}/oauth/${platform}/callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, state })
        });

        if (!response.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const result = await response.json();
        
        if (result.success) {
            showNotification(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully!`, 'success');
            // Reload accounts after a short delay
            setTimeout(() => {
                loadSocialAccounts();
            }, 1000);
        } else {
            showNotification('Failed to connect account', 'error');
        }

    } catch (error) {
        console.error('Token exchange error:', error);
        showNotification('Failed to connect account', 'error');
    }
}

// Initialize social accounts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Handle OAuth callback on page load
    handleOAuthCallback();
    
    // Initialize social accounts if on accounts page
    if (window.location.hash === '#accounts' || document.getElementById('accounts')) {
        setTimeout(() => {
            initializeSocialAccounts();
        }, 100);
    }
});

// Make refreshAccounts function globally available
function refreshAccounts() {
    loadSocialAccounts();
    showNotification('Accounts refreshed', 'info');
}

console.log('Social Accounts functionality loaded');
