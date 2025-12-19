// Social Media Manager - Clean Implementation
class SocialMediaManager {
    constructor() {
        this.apiBaseUrl = 'https://socialmediamanager-api-production.hlpfl-co.workers.dev';
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Auth forms
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Navigation
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Create post form
        const createPostForm = document.getElementById('create-post-form');
        if (createPostForm) {
            createPostForm.addEventListener('submit', (e) => this.handleCreatePost(e));
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);
            });
        });
    }

    async checkAuthStatus() {
        if (this.token) {
            try {
                const response = await this.apiCall('/api/user/profile', 'GET');
                if (response.user) {
                    this.currentUser = response.user;
                    this.showDashboard();
                } else {
                    this.showAuth();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            this.showLoading('Logging in...');
            const response = await this.apiCall('/api/auth/login', 'POST', { email, password });
            
            if (response.token) {
                this.token = response.token;
                this.currentUser = response.user;
                localStorage.setItem('token', this.token);
                this.showDashboard();
                this.showNotification('Login successful!', 'success');
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification(error.message || 'Login failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        try {
            this.showLoading('Creating account...');
            const response = await this.apiCall('/api/auth/register', 'POST', { name, email, password });
            
            if (response.token) {
                this.token = response.token;
                this.currentUser = response.user;
                localStorage.setItem('token', this.token);
                this.showDashboard();
                this.showNotification('Account created successfully!', 'success');
            } else {
                throw new Error(response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification(error.message || 'Registration failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    handleLogout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.showAuth();
        this.showNotification('Logged out successfully', 'info');
    }

    async handleCreatePost(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const content = formData.get('content');
        const platform = formData.get('platform');
        const status = formData.get('status');

        try {
            this.showLoading('Creating post...');
            const response = await this.apiCall('/api/posts', 'POST', { content, platform, status });
            
            if (response.message) {
                this.showNotification('Post created successfully!', 'success');
                e.target.reset();
                this.loadPosts();
            } else {
                throw new Error(response.error || 'Failed to create post');
            }
        } catch (error) {
            console.error('Create post error:', error);
            this.showNotification(error.message || 'Failed to create post', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadPosts() {
        try {
            const response = await this.apiCall('/api/posts', 'GET');
            if (response.posts) {
                this.displayPosts(response.posts);
            }
        } catch (error) {
            console.error('Load posts error:', error);
        }
    }

    displayPosts(posts) {
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) return;

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p class="no-posts">No posts yet. Create your first post!</p>';
            return;
        }

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <span class="post-platform">${post.platform}</span>
                    <span class="post-status ${post.status}">${post.status}</span>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-footer">
                    <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    showAuth() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('dashboard-container').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'block';
        document.getElementById('user-name').textContent = this.currentUser?.name || 'User';
        this.loadPosts();
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(this.apiBaseUrl + endpoint, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        return result;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showLoading(message = 'Loading...') {
        let loader = document.getElementById('loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loader';
            loader.className = 'loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Character counter for post content
document.addEventListener('DOMContentLoaded', () => {
    const contentTextarea = document.getElementById('post-content');
    const charCounter = document.getElementById('char-counter');
    
    if (contentTextarea && charCounter) {
        contentTextarea.addEventListener('input', () => {
            const length = contentTextarea.value.length;
            charCounter.textContent = `${length}/280`;
            
            if (length > 280) {
                charCounter.style.color = '#ef4444';
            } else if (length > 250) {
                charCounter.style.color = '#f59e0b';
            } else {
                charCounter.style.color = '#6b7280';
            }
        });
    }
});

// Initialize the app
const app = new SocialMediaManager();