class SocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
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

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('-translate-x-full');
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

    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'posts':
                await this.loadPosts();
                break;
            case 'schedule':
                await this.loadSchedule();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'accounts':
                await this.loadAccounts();
                break;
            case 'media':
                await this.loadMedia();
                break;
        }
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

    updatePlatformSelection() {
        this.selectedPlatforms = [];
        document.querySelectorAll('.platform-checkbox:checked').forEach(checkbox => {
            this.selectedPlatforms.push(checkbox.value);
        });

        // Update platform limit display
        const limitElement = document.getElementById('platformLimit');
        if (limitElement && this.selectedPlatforms.length > 0) {
            const platform = this.selectedPlatforms[0];
            const limits = this.getPlatformLimits(platform);
            limitElement.textContent = `Max: ${limits.maxLength} characters`;
        } else {
            limitElement.textContent = '';
        }
    }

    updateCharacterCount() {
        const content = document.getElementById('postContent').value;
        const charCountElement = document.getElementById('charCount');
        if (!charCountElement) return;

        charCountElement.textContent = content.length;

        if (this.selectedPlatforms.length > 0) {
            const platform = this.selectedPlatforms[0];
            const limits = this.getPlatformLimits(platform);
            
            charCountElement.classList.remove('warning', 'danger');
            if (content.length > limits.maxLength) {
                charCountElement.classList.add('danger');
            } else if (content.length > limits.maxLength * 0.8) {
                charCountElement.classList.add('warning');
            }
        }
    }

    toggleScheduleOptions() {
        const scheduleOptions = document.getElementById('scheduleOptions');
        const isChecked = document.getElementById('schedulePost').checked;
        
        if (isChecked) {
            scheduleOptions.classList.remove('hidden');
            // Set default time to next hour
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            document.getElementById('scheduledTime').value = now.toISOString().slice(0, 16);
        } else {
            scheduleOptions.classList.add('hidden');
        }
    }

    async handleMediaUpload(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }

        try {
            const response = await this.apiCall('/api/media/upload', {
                method: 'POST',
                body: formData
            });

            if (response.success) {
                this.uploadedMedia = response.files;
                this.displayMediaPreview();
            } else {
                this.showError('Failed to upload media');
            }
        } catch (error) {
            console.error('Media upload error:', error);
            this.showError('Failed to upload media');
        }
    }

    displayMediaPreview() {
        const preview = document.getElementById('mediaPreview');
        if (!preview) return;

        preview.innerHTML = this.uploadedMedia.map(file => `
            <div class="relative group">
                ${file.mimetype.startsWith('image/') ? 
                    `<img src="${file.url}" alt="${file.originalName}" class="w-full h-32 object-cover rounded-lg">` :
                    `<div class="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <i class="fas fa-video text-gray-400 text-2xl"></i>
                    </div>`
                }
                <button onclick="this.parentElement.remove()" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `).join('');
    }

    async publishPost() {
        const content = document.getElementById('postContent').value.trim();
        const isScheduled = document.getElementById('schedulePost').checked;
        const scheduledTime = isScheduled ? document.getElementById('scheduledTime').value : null;

        if (!content) {
            this.showError('Please enter content for your post');
            return;
        }

        if (this.selectedPlatforms.length === 0) {
            this.showError('Please select at least one platform');
            return;
        }

        const postData = {
            content,
            platforms: this.selectedPlatforms,
            mediaUrls: this.uploadedMedia.map(file => file.url)
        };

        if (isScheduled && scheduledTime) {
            postData.scheduledFor = scheduledTime;
        }

        try {
            const response = await this.apiCall('/api/posts', {
                method: 'POST',
                body: JSON.stringify(postData)
            });

            if (response.success) {
                this.showSuccess(isScheduled ? 'Post scheduled successfully!' : 'Post published successfully!');
                this.resetPostForm();
                await this.loadDashboard();
            } else {
                this.showError('Failed to publish post');
            }
        } catch (error) {
            console.error('Publish error:', error);
            this.showError('Failed to publish post');
        }
    }

    resetPostForm() {
        document.getElementById('postContent').value = '';
        document.getElementById('schedulePost').checked = false;
        document.getElementById('scheduleOptions').classList.add('hidden');
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.displayMediaPreview();
        this.updateCharacterCount();
    }

    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const config = { ...defaultOptions, ...options };

        if (options.body && typeof options.body === 'string') {
            config.headers['Content-Type'] = 'application/json';
        } else if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }

        const response = await fetch(endpoint, config);
        return await response.json();
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

    getPlatformLimits(platform) {
        const limits = {
            twitter: { maxLength: 280, maxMedia: 4 },
            linkedin: { maxLength: 3000, maxMedia: 1 },
            facebook: { maxLength: 63206, maxMedia: 10 },
            instagram: { maxLength: 2200, maxMedia: 10 }
        };
        return limits[platform] || { maxLength: 280, maxMedia: 1 };
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

    showError(message) {
        // Simple error notification - could be enhanced with a toast library
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple success notification - could be enhanced with a toast library
        alert('Success: ' + message);
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        // Redirect to login or show login modal
    }
}

// Initialize the app
const app = new SocialMediaManager();