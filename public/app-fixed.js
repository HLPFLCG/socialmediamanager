// Fixed Social Media Manager JavaScript
class SocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token') || 'demo-token';
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.apiBaseUrl = window.location.origin.includes('hlpfl.space') ? '/api' : 'https://api.hlpfl.space';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        
        sidebarToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
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
        const scheduleOptions = document.getElementById('scheduleOptions');
        if (schedulePost && scheduleOptions) {
            schedulePost.addEventListener('change', () => {
                if (schedulePost.checked) {
                    scheduleOptions.classList.remove('hidden');
                } else {
                    scheduleOptions.classList.add('hidden');
                }
            });
        }

        // Publish button
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                this.publishPost();
            });
        }

        // Drag and drop
        const uploadArea = document.querySelector('[onclick*="mediaUpload"]');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('border-blue-500', 'bg-blue-50');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
                this.handleFileDrop(e);
            });
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
    }

    async loadDashboard() {
        try {
            // Simulate dashboard data
            const dashboardData = {
                totalPosts: 12,
                scheduledPosts: 3,
                publishedPosts: 9,
                connectedAccounts: 2
            };

            // Update stats
            this.updateElement('totalPosts', dashboardData.totalPosts);
            this.updateElement('scheduledPosts', dashboardData.scheduledPosts);
            this.updateElement('publishedPosts', dashboardData.publishedPosts);
            this.updateElement('connectedAccounts', dashboardData.connectedAccounts);

            // Load recent posts
            await this.loadRecentPosts();

        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async loadRecentPosts() {
        try {
            const response = await this.apiCall('/posts');
            if (response.success) {
                this.renderRecentPosts(response.posts);
            }
        } catch (error) {
            console.error('Failed to load recent posts:', error);
            this.renderEmptyRecentPosts();
        }
    }

    renderRecentPosts(posts) {
        const container = document.getElementById('recentPosts');
        if (!container) return;

        if (!posts || posts.length === 0) {
            this.renderEmptyRecentPosts();
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="post-card border rounded-lg p-4 hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex space-x-2">
                        ${post.platforms.map(platform => this.getPlatformBadge(platform)).join('')}
                    </div>
                    <span class="text-sm text-gray-500">${this.formatDate(post.createdAt)}</span>
                </div>
                <p class="text-gray-700 mb-2">${post.content}</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm px-2 py-1 rounded-full ${this.getStatusClass(post.status)}">
                        ${post.status}
                    </span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                        View
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderEmptyRecentPosts() {
        const container = document.getElementById('recentPosts');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 mb-4">No posts yet</p>
                <button class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700" onclick="window.location.hash='#posts'">
                    Create Your First Post
                </button>
            </div>
        `;
    }

    updatePlatformSelection() {
        const checkboxes = document.querySelectorAll('.platform-checkbox:checked');
        this.selectedPlatforms = Array.from(checkboxes).map(cb => cb.value);
        
        // Update UI
        document.querySelectorAll('.platform-badge').forEach(badge => {
            const checkbox = badge.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                badge.classList.add('bg-indigo-100', 'border-indigo-500');
            } else if (checkbox) {
                badge.classList.remove('bg-indigo-100', 'border-indigo-500');
            }
        });

        this.updateCharacterLimit();
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
        }
        return 280; // Default
    }

    updateCharacterLimit() {
        this.updateCharacterCount();
        
        const platformLimit = document.getElementById('platformLimit');
        if (platformLimit) {
            const limit = this.getCurrentCharacterLimit();
            platformLimit.textContent = `Limit: ${limit} characters`;
        }
    }

    async handleMediaUpload(event) {
        const files = Array.from(event.target.files);
        await this.processMediaFiles(files);
    }

    async handleFileDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        await this.processMediaFiles(files);
    }

    async processMediaFiles(files) {
        const validFiles = files.filter(file => 
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );

        for (const file of validFiles) {
            try {
                // Show loading state
                this.showNotification(`Uploading ${file.name}...`, 'info');
                
                // Create FormData for upload
                const formData = new FormData();
                formData.append('file', file);

                // Upload file
                const response = await fetch(`${this.apiBaseUrl}/media/upload`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    this.uploadedMedia.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: URL.createObjectURL(file),
                        uploadData: result.file
                    });
                    
                    this.showNotification(`${file.name} uploaded successfully!`, 'success');
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                console.error('File upload error:', error);
                this.showNotification(`Failed to upload ${file.name}: ${error.message}`, 'error');
            }
        }

        this.renderMediaPreview();
    }

    renderMediaPreview() {
        const preview = document.getElementById('mediaPreview');
        if (!preview) return;

        if (this.uploadedMedia.length === 0) {
            preview.innerHTML = '';
            return;
        }

        preview.innerHTML = this.uploadedMedia.map((media, index) => `
            <div class="relative border rounded-lg overflow-hidden">
                ${media.type.startsWith('image/') ? 
                    `<img src="${media.url}" alt="${media.name}" class="w-full h-32 object-cover">` :
                    `<video src="${media.url}" class="w-full h-32 object-cover" controls></video>`
                }
                <button onclick="app.removeMedia(${index})" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                    <i class="fas fa-times"></i>
                </button>
                <div class="p-2 text-xs text-gray-600">
                    <div class="truncate">${media.name}</div>
                    <div>${this.formatFileSize(media.size)}</div>
                </div>
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
            document.getElementById('scheduledTime').value : null;

        try {
            const postData = {
                content: content,
                platforms: this.selectedPlatforms,
                mediaFiles: this.uploadedMedia,
                scheduledTime: scheduledTime
            };

            this.showNotification('Publishing post...', 'info');

            const response = await this.apiCall('/posts', {
                method: 'POST',
                body: JSON.stringify(postData)
            });

            if (response.success) {
                this.showNotification('Post published successfully!', 'success');
                this.clearComposer();
                await this.loadDashboard();
                this.navigateToSection('dashboard');
            } else {
                this.showNotification(response.error || 'Failed to publish post', 'error');
            }
        } catch (error) {
            console.error('Publish failed:', error);
            this.showNotification('Failed to publish post: ' + error.message, 'error');
        }
    }

    clearComposer() {
        document.getElementById('postContent').value = '';
        document.getElementById('mediaUpload').value = '';
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        this.uploadedMedia = [];
        this.selectedPlatforms = [];
        this.renderMediaPreview();
        this.updatePlatformSelection();
        this.updateCharacterCount();
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2 max-w-sm`;
        
        // Set color based on type
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        notification.className += ` ${colors[type] || colors.info}`;
        
        // Set icon based on type
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Animate in
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-100%)';
        notification.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getPlatformBadge(platform) {
        const badges = {
            twitter: '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fab fa-twitter mr-1"></i>Twitter</span>',
            linkedin: '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fab fa-linkedin mr-1"></i>LinkedIn</span>',
            facebook: '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fab fa-facebook mr-1"></i>Facebook</span>',
            instagram: '<span class="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full"><i class="fab fa-instagram mr-1"></i>Instagram</span>',
            tiktok: '<span class="px-2 py-1 bg-black text-white text-xs rounded-full"><i class="fab fa-tiktok mr-1"></i>TikTok</span>',
            youtube: '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"><i class="fab fa-youtube mr-1"></i>YouTube</span>'
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

// Initialize the app
const app = new SocialMediaManager();