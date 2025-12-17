// HLPFL Social Media Manager - Frontend Application
// API Configuration
const API_BASE_URL = 'https://socialmediamanager-api-production.hlpfl-co.workers.dev/api';

class SocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
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
        this.showNotification('Logged out successfully', 'info');
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SocialMediaManager();
});