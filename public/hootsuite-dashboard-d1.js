// Hootsuite-style Dashboard JavaScript - D1 Compatible
class HLPFLSocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.apiBaseUrl = window.location.origin.includes('hlpfl.space') ? '/api' : 'https://api.hlpfl.space';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadDashboard();
        } else {
            this.showAuthModal();
        }
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        
        mobileToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });

        // Post form submission
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createPost();
            });
        }

        // Platform selection
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

        // File upload
        const fileInput = document.getElementById('mediaUpload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        // Auth form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }
    }

    async checkAuth() {
        if (!this.token) {
            return false;
        }

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

    showAuthModal() {
        // Create auth modal if it doesn't exist
        let authModal = document.getElementById('authModal');
        if (!authModal) {
            authModal = document.createElement('div');
            authModal.id = 'authModal';
            authModal.className = 'auth-modal';
            authModal.innerHTML = `
                <div class="auth-modal-content">
                    <h2>Welcome to HLPFL Social Media Manager</h2>
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">Login</button>
                        <button class="auth-tab" data-tab="register">Register</button>
                    </div>
                    <form id="authForm">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <div class="form-group" id="nameGroup" style="display: none;">
                            <label for="name">Name</label>
                            <input type="text" id="name" name="name">
                        </div>
                        <button type="submit" id="authSubmit">Login</button>
                    </form>
                </div>
            `;
            document.body.appendChild(authModal);

            // Tab switching
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    const isRegister = e.target.getAttribute('data-tab') === 'register';
                    document.getElementById('nameGroup').style.display = isRegister ? 'block' : 'none';
                    document.getElementById('authSubmit').textContent = isRegister ? 'Register' : 'Login';
                });
            });
        }
        
        authModal.style.display = 'flex';
    }

    hideAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.style.display = 'none';
        }
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
            } else {
                this.showNotification(response.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            this.showNotification('Authentication failed: ' + error.message, 'error');
        }
    }

    showUserInterface() {
        // Hide auth modal and show dashboard
        this.hideAuthModal();
        
        // Update UI with user info
        const userName = document.getElementById('userName');
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.name;
        }
    }

    async loadDashboard() {
        if (!this.currentUser) return;

        try {
            const [statsResponse, postsResponse, accountsResponse] = await Promise.all([
                this.apiCall('/api/dashboard/stats'),
                this.apiCall('/api/posts'),
                this.apiCall('/api/social/accounts')
            ]);

            this.updateDashboardStats(statsResponse);
            this.updateRecentPosts(postsResponse.posts);
            this.updateConnectedAccounts(accountsResponse.accounts);
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
            reach: document.getElementById('reach'),
            engagement: document.getElementById('engagement')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key] && data.stats[key] !== undefined) {
                this.animateNumber(elements[key], data.stats[key]);
            }
        });
    }

    updateRecentPosts(posts) {
        const postsContainer = document.getElementById('recentPosts');
        if (!postsContainer || !Array.isArray(posts)) return;

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-item">
                <div class="post-content">
                    <p>${this.truncateText(post.content, 100)}</p>
                    <div class="post-platforms">
                        ${post.platforms.map(platform => `<span class="platform-tag">${platform}</span>`).join('')}
                    </div>
                </div>
                <div class="post-meta">
                    <small>${new Date(post.created_at).toLocaleDateString()}</small>
                    <span class="post-status ${post.status}">${post.status}</span>
                </div>
            </div>
        `).join('');
    }

    updateConnectedAccounts(accounts) {
        const accountsContainer = document.getElementById('connectedAccounts');
        if (!accountsContainer || !Array.isArray(accounts)) return;

        accountsContainer.innerHTML = accounts.map(account => `
            <div class="account-item">
                <i class="fab fa-${account.platform}"></i>
                <span>${account.username || account.platform}</span>
                <span class="connected-badge">Connected</span>
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
        document.getElementById('characterCount').textContent = '0';
        document.getElementById('mediaPreview').innerHTML = '';
    }

    updateCharacterCount() {
        const content = document.getElementById('postContent').value || '';
        const count = content.length;
        const maxCount = this.getMaxCharacterCount();
        const countElement = document.getElementById('characterCount');
        
        if (countElement) {
            countElement.textContent = count;
            countElement.className = count > maxCount * 0.9 ? 'warning' : '';
        }
    }

    getMaxCharacterCount() {
        const platformLimits = {
            twitter: 280,
            linkedin: 3000,
            facebook: 8000,
            instagram: 2200
        };

        if (this.selectedPlatforms.length === 0) return 280;
        return Math.min(...this.selectedPlatforms.map(p => platformLimits[p] || 280));
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        const mediaPreview = document.getElementById('mediaPreview');
        if (!mediaPreview) return;

        for (const file of files) {
            if (file.size > 100 * 1024 * 1024) { // 100MB limit
                this.showNotification('File size must be less than 100MB', 'error');
                continue;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await this.apiCall('/api/media/upload', 'POST', formData, true);
                
                if (response.success) {
                    this.uploadedMedia.push(response.file.url);
                    
                    const preview = document.createElement('div');
                    preview.className = 'media-preview-item';
                    preview.innerHTML = `
                        <i class="fas fa-${file.type.startsWith('image/') ? 'image' : 'video'}"></i>
                        <span>${file.name}</span>
                        <button type="button" onclick="this.parentElement.remove()">&times;</button>
                    `;
                    mediaPreview.appendChild(preview);
                }
            } catch (error) {
                this.showNotification('Failed to upload file: ' + error.message, 'error');
            }
        }
    }

    navigateToSection(section) {
        // Hide all sections
        document.querySelectorAll('.main-section').forEach(s => {
            s.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${section}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null, isFormData = false) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const options = {
            method,
            headers: {}
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (!isFormData && data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (isFormData && data) {
            options.body = data;
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    }

    animateNumber(element, target) {
        const duration = 1000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
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
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new HLPFLSocialMediaManager();
});

// Add CSS for auth modal
const authStyles = `
    .auth-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .auth-modal-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        width: 90%;
    }

    .auth-tabs {
        display: flex;
        margin-bottom: 1.5rem;
    }

    .auth-tab {
        flex: 1;
        padding: 0.5rem;
        border: none;
        background: #f5f5f5;
        cursor: pointer;
        border-radius: 6px 6px 0 0;
        margin-right: 0.5rem;
    }

    .auth-tab.active {
        background: #007bff;
        color: white;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .form-group input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }

    .auth-modal-content button[type="submit"] {
        width: 100%;
        padding: 0.75rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
    }

    .auth-modal-content button[type="submit"]:hover {
        background: #0056b3;
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    }

    .notification.success {
        background: #28a745;
    }

    .notification.error {
        background: #dc3545;
    }

    .notification.info {
        background: #17a2b8;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

// Add styles to head
if (!document.getElementById('auth-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'auth-styles';
    styleSheet.textContent = authStyles;
    document.head.appendChild(styleSheet);
}