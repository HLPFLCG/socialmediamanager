// Cloudflare-optimized version of app.js
class SocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        // Use Cloudflare Workers URL
        this.apiBaseUrl = import.meta.env?.VITE_API_URL || 'https://api.hlpfl.space';
        this.init();
    }

    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const config = { ...defaultOptions, ...options };
        
        // Use full URL for Cloudflare Workers
        const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;

        try {
            const response = await fetch(url, config);
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Rest of the class remains the same...
    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('href').substring(1);
                this.navigateToSection(section);
            });
        });

        // Platform selection
        document.querySelectorAll('.platform-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updatePlatformSelection();
            });
        });

        // Content editor
        const contentTextarea = document.getElementById('postContent');
        if (contentTextarea) {
            contentTextarea.addEventListener('input', () => {
                this.updateCharacterCount();
            });
        }

        // Media upload
        const mediaUpload = document.getElementById('mediaUpload');
        if (mediaUpload) {
            mediaUpload.addEventListener('change', (e) => {
                this.handleMediaUpload(e);
            });
        }

        // Schedule toggle
        const schedulePost = document.getElementById('schedulePost');
        if (schedulePost) {
            schedulePost.addEventListener('change', () => {
                this.toggleScheduleOptions();
            });
        }

        // Publish button
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                this.publishPost();
            });
        }
    }

    // Copy all other methods from original app.js...
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('-translate-x-full');
    }

    navigateToSection(section) {
        // Hide all sections
        document.querySelectorAll('section').forEach(s => {
            s.classList.add('hidden');
        });

        // Show selected section
        const sectionElement = document.getElementById(`${section}-section`);
        if (sectionElement) {
            sectionElement.classList.remove('hidden');
        }

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-indigo-100', 'text-indigo-700');
            item.classList.add('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
        });

        const activeItem = document.querySelector(`[href="#${section}"]`);
        if (activeItem) {
            activeItem.classList.add('bg-indigo-100', 'text-indigo-700');
            activeItem.classList.remove('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
        }

        // Load section data
        this.loadSectionData(section);
    }

    async checkAuth() {
        if (!this.token) {
            this.navigateToSection('dashboard');
            return;
        }

        try {
            const response = await this.apiCall('/api/auth/me');
            if (response.success) {
                this.currentUser = response.user;
                await this.loadDashboard();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    async loadDashboard() {
        try {
            const response = await this.apiCall('/api/users/dashboard');
            if (response.success) {
                const dashboard = response.dashboard;
                
                // Update stats
                document.getElementById('totalPosts').textContent = dashboard.overview.totalPosts;
                document.getElementById('scheduledPosts').textContent = dashboard.overview.scheduledPosts;
                document.getElementById('publishedPosts').textContent = dashboard.overview.publishedPosts;
                document.getElementById('connectedAccounts').textContent = dashboard.overview.connectedAccounts;

                // Load recent posts
                this.loadRecentPosts(dashboard.recentPosts);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    loadRecentPosts(posts) {
        const container = document.getElementById('recentPosts');
        if (!container) return;

        if (posts.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No recent posts</p>';
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="post-card border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex space-x-2">
                        ${post.platforms.map(platform => this.getPlatformBadge(platform)).join('')}
                    </div>
                    <span class="text-sm text-gray-500">${this.formatDate(post.createdAt)}</span>
                </div>
                <p class="text-gray-700 mb-2">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm px-2 py-1 rounded-full ${this.getStatusClass(post.status)}">
                        ${post.status}
                    </span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm">View</button>
                </div>
            </div>
        `).join('');
    }

    getPlatformBadge(platform) {
        const badges = {
            twitter: '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fab fa-twitter mr-1"></i>Twitter</span>',
            linkedin: '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fab fa-linkedin mr-1"></i>LinkedIn</span>',
            facebook: '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fab fa-facebook mr-1"></i>Facebook</span>',
            instagram: '<span class="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full"><i class="fab fa-instagram mr-1"></i>Instagram</span>'
        };
        return badges[platform] || platform;
    }

    getStatusClass(status) {
        const classes = {
            draft: 'bg-gray-100 text-gray-800',
            scheduled: 'bg-yellow-100 text-yellow-800',
            posted: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
    }
}

// Initialize the app
const app = new SocialMediaManager();