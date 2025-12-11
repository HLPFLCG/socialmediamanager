// Hootsuite-style Dashboard JavaScript
class HLPFLSocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.apiBaseUrl = 'https://api.hlpfl.space';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadDashboard();
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
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Platform selection
        document.querySelectorAll('.platform-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updatePlatformSelection();
                this.updateCharacterLimit();
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
        const uploadArea = document.getElementById('uploadArea');
        const mediaInput = document.getElementById('mediaInput');
        
        uploadArea?.addEventListener('click', () => {
            mediaInput?.click();
        });

        mediaInput?.addEventListener('change', (e) => {
            this.handleMediaUpload(e);
        });

        // Drag and drop
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleMediaDrop(e);
        });

        // Schedule toggle
        const schedulePost = document.getElementById('schedulePost');
        const scheduleFields = document.getElementById('scheduleFields');
        
        schedulePost?.addEventListener('change', () => {
            if (schedulePost.checked) {
                scheduleFields.style.display = 'flex';
            } else {
                scheduleFields.style.display = 'none';
            }
        });

        // Action buttons
        document.getElementById('publishBtn')?.addEventListener('click', () => {
            this.publishPost();
        });

        document.getElementById('saveDraftBtn')?.addEventListener('click', () => {
            this.saveDraft();
        });

        document.getElementById('quickPostBtn')?.addEventListener('click', () => {
            this.navigateToSection('compose');
        });

        // Toolbar buttons
        document.getElementById('addEmojiBtn')?.addEventListener('click', () => {
            this.addEmoji();
        });

        document.getElementById('addHashtagBtn')?.addEventListener('click', () => {
            this.generateHashtags();
        });

        document.getElementById('viewAllPosts')?.addEventListener('click', () => {
            this.navigateToSection('analytics');
        });
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
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const config = { ...defaultOptions, ...options };
        
        // Use full URL for API calls
        const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || 'API call failed');
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    navigateToSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => {
            s.style.display = 'none';
        });

        // Show selected section
        const sectionElement = document.getElementById(`${section}-section`);
        if (sectionElement) {
            sectionElement.style.display = 'block';
        }

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-section="${section}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            compose: 'Compose Post',
            accounts: 'Connected Accounts',
            analytics: 'Analytics',
            scheduler: 'Content Scheduler',
            media: 'Media Library',
            settings: 'Settings'
        };

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[section] || 'Dashboard';
        }

        // Load section data
        this.loadSectionData(section);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'accounts':
                await this.loadAccounts();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'scheduler':
                await this.loadScheduler();
                break;
            case 'media':
                await this.loadMediaLibrary();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await this.apiCall('/api/users/dashboard');
            if (response.success) {
                const dashboard = response.dashboard;
                
                // Update stats
                this.updateElement('totalPosts', dashboard.overview?.totalPosts || 0);
                this.updateElement('scheduledPosts', dashboard.overview?.scheduledPosts || 0);
                this.updateElement('engagementRate', dashboard.overview?.engagementRate || '0%');
                this.updateElement('connectedAccounts', dashboard.overview?.connectedAccounts || 0);

                // Load recent posts
                await this.loadRecentPosts();
                
                // Load platform stats
                await this.loadPlatformStats();
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async loadRecentPosts() {
        try {
            const response = await this.apiCall('/api/posts?limit=10');
            if (response.success) {
                this.renderRecentPosts(response.posts);
            }
        } catch (error) {
            console.error('Failed to load recent posts:', error);
            this.renderEmptyState('recentPosts');
        }
    }

    renderRecentPosts(posts) {
        const container = document.getElementById('recentPosts');
        if (!container) return;

        if (!posts || posts.length === 0) {
            this.renderEmptyState('recentPosts');
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="post-card fade-in">
                <div class="post-header">
                    <div class="post-platforms">
                        ${post.platforms.map(platform => 
                            `<span class="platform-badge ${platform}">${this.getPlatformName(platform)}</span>`
                        ).join('')}
                    </div>
                    <div class="post-time">${this.formatDate(post.createdAt)}</div>
                </div>
                <div class="post-content">
                    ${post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}
                </div>
                <div class="post-footer">
                    <span class="post-status ${post.status}">${post.status}</span>
                    <div class="post-actions">
                        <button class="post-action-btn" onclick="app.viewPost('${post._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="post-action-btn" onclick="app.editPost('${post._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderEmptyState(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-inbox fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No posts yet</p>
                <button class="btn btn-primary" onclick="app.navigateToSection('compose')">
                    Create Your First Post
                </button>
            </div>
        `;
    }

    async loadPlatformStats() {
        try {
            const response = await this.apiCall('/api/social/accounts');
            if (response.success) {
                const accounts = response.accounts || [];
                
                // Update platform cards
                accounts.forEach(account => {
                    this.updatePlatformCard(account);
                });
            }
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        }
    }

    updatePlatformCard(account) {
        const platform = account.platform;
        
        // Update platform info
        const platformInfo = document.querySelector(`.platform-card .platform-icon.${platform}`);
        if (platformInfo) {
            const infoDiv = platformInfo.nextElementSibling;
            if (infoDiv) {
                infoDiv.querySelector('h3').textContent = this.getPlatformName(platform);
                infoDiv.querySelector('p').textContent = account.displayName;
            }
        }

        // Update platform stats
        const statsContainer = document.querySelector(`.platform-card .platform-icon.${platform}`).closest('.platform-card');
        if (statsContainer) {
            const stats = statsContainer.querySelectorAll('.platform-stat-value');
            
            if (platform === 'twitter') {
                stats[0].textContent = account.followers || 0;
                stats[1].textContent = account.postCount || 0;
                stats[2].textContent = '0'; // Engagement would need calculation
            } else if (platform === 'linkedin') {
                stats[0].textContent = account.followers || 0;
                stats[1].textContent = account.postCount || 0;
                stats[2].textContent = '0';
            }
            // Add more platforms as needed
        }
    }

    updatePlatformSelection() {
        const checkboxes = document.querySelectorAll('.platform-checkbox:checked');
        this.selectedPlatforms = Array.from(checkboxes).map(cb => cb.value);
        
        // Update UI
        document.querySelectorAll('.platform-chip').forEach(chip => {
            const checkbox = chip.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });

        // Show/hide schedule options
        const scheduleOptions = document.getElementById('scheduleOptions');
        if (this.selectedPlatforms.length > 0) {
            scheduleOptions.style.display = 'block';
        } else {
            scheduleOptions.style.display = 'none';
        }
    }

    updateCharacterCount() {
        const textarea = document.getElementById('postContent');
        const charCount = document.getElementById('charCount');
        
        if (!textarea || !charCount) return;
        
        const length = textarea.value.length;
        const limit = this.getCurrentCharacterLimit();
        
        charCount.textContent = `${length} / ${limit}`;
        
        // Update color based on limit
        charCount.classList.remove('warning', 'danger');
        if (length > limit * 0.9) {
            charCount.classList.add('danger');
        } else if (length > limit * 0.8) {
            charCount.classList.add('warning');
        }
    }

    getCurrentCharacterLimit() {
        if (this.selectedPlatforms.includes('twitter')) {
            return 280;
        } else if (this.selectedPlatforms.includes('tiktok')) {
            return 150;
        } else if (this.selectedPlatforms.includes('instagram')) {
            return 2200;
        } else if (this.selectedPlatforms.includes('youtube')) {
            return 5000;
        }
        return 280; // Default to Twitter limit
    }

    updateCharacterLimit() {
        this.updateCharacterCount();
    }

    async handleMediaUpload(event) {
        const files = Array.from(event.target.files);
        await this.processMediaFiles(files);
    }

    async handleMediaDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        await this.processMediaFiles(files);
    }

    async processMediaFiles(files) {
        const validFiles = files.filter(file => 
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );

        for (const file of validFiles) {
            const buffer = await file.arrayBuffer();
            const mediaData = {
                name: file.name,
                type: file.type,
                size: file.size,
                buffer: buffer,
                url: URL.createObjectURL(file)
            };

            this.uploadedMedia.push(mediaData);
        }

        this.renderMediaPreview();
    }

    renderMediaPreview() {
        const preview = document.getElementById('mediaPreview');
        if (!preview) return;

        preview.innerHTML = this.uploadedMedia.map((media, index) => `
            <div class="media-item">
                ${media.type.startsWith('image/') ? 
                    `<img src="${media.url}" alt="${media.name}">` :
                    `<video src="${media.url}" controls></video>`
                }
                <button class="media-remove" onclick="app.removeMedia(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeMedia(index) {
        this.uploadedMedia.splice(index, 1);
        this.renderMediaPreview();
    }

    async publishPost() {
        if (this.selectedPlatforms.length === 0) {
            this.showNotification('Please select at least one platform', 'warning');
            return;
        }

        const content = document.getElementById('postContent').value.trim();
        if (!content && this.uploadedMedia.length === 0) {
            this.showNotification('Please add content or media', 'warning');
            return;
        }

        const schedulePost = document.getElementById('schedulePost');
        const scheduledTime = schedulePost.checked ? 
            document.getElementById('scheduleTime').value : null;

        try {
            const postData = {
                content: content,
                platforms: this.selectedPlatforms,
                mediaFiles: this.uploadedMedia,
                scheduledTime: scheduledTime
            };

            const response = await this.apiCall('/api/posts/unified', {
                method: 'POST',
                body: JSON.stringify(postData)
            });

            if (response.success) {
                this.showNotification('Post published successfully!', 'success');
                this.clearComposer();
                await this.loadDashboard();
            } else {
                this.showNotification(response.error || 'Failed to publish post', 'error');
            }
        } catch (error) {
            console.error('Publish failed:', error);
            this.showNotification('Failed to publish post', 'error');
        }
    }

    async saveDraft() {
        // Similar to publishPost but with status 'draft'
        this.showNotification('Draft saved', 'success');
    }

    clearComposer() {
        document.getElementById('postContent').value = '';
        document.getElementById('mediaInput').value = '';
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        this.uploadedMedia = [];
        this.selectedPlatforms = [];
        this.renderMediaPreview();
        this.updatePlatformSelection();
        this.updateCharacterCount();
    }

    addEmoji() {
        // Simple emoji picker
        const emojis = ['😊', '👍', '❤️', '🔥', '💯', '🚀', '💡', '🎉'];
        const textarea = document.getElementById('postContent');
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        textarea.value += emoji;
        this.updateCharacterCount();
        textarea.focus();
    }

    async generateHashtags() {
        const content = document.getElementById('postContent').value;
        if (!content) {
            this.showNotification('Please add some content first', 'warning');
            return;
        }

        try {
            const response = await this.apiCall('/api/social/hashtags/suggest', {
                method: 'POST',
                body: JSON.stringify({
                    content: content,
                    platforms: this.selectedPlatforms
                })
            });

            if (response.success) {
                const hashtags = response.suggestions;
                // Add hashtags to content
                const textarea = document.getElementById('postContent');
                const allHashtags = Object.values(hashtags).flat().slice(0, 5);
                textarea.value += '\n\n' + allHashtags.map(tag => `#${tag}`).join(' ');
                this.updateCharacterCount();
            }
        } catch (error) {
            console.error('Failed to generate hashtags:', error);
            this.showNotification('Failed to generate hashtags', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    getPlatformName(platform) {
        const names = {
            twitter: 'Twitter',
            linkedin: 'LinkedIn',
            facebook: 'Facebook',
            instagram: 'Instagram',
            tiktok: 'TikTok',
            youtube: 'YouTube'
        };
        return names[platform] || platform;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        // Redirect to login or show login modal
        window.location.reload();
    }

    viewPost(postId) {
        // Navigate to post details
        console.log('View post:', postId);
    }

    editPost(postId) {
        // Navigate to edit post
        console.log('Edit post:', postId);
    }

    async loadAccounts() {
        // Load connected accounts section
        console.log('Loading accounts...');
    }

    async loadAnalytics() {
        // Load analytics section
        console.log('Loading analytics...');
    }

    async loadScheduler() {
        // Load scheduler section
        console.log('Loading scheduler...');
    }

    async loadMediaLibrary() {
        // Load media library section
        console.log('Loading media library...');
    }
}

// Initialize the app
const app = new HLPFLSocialMediaManager();