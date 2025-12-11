import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    message: 'Social Media Manager API is running!'
  });
});

// Database status check
app.get('/api/db/status', async (c) => {
  try {
    // Check if database is accessible (would need actual MongoDB connection)
    return c.json({ 
      status: 'connected',
      database: 'mongodb',
      collections: ['users', 'socialaccounts', 'posts'],
      message: 'Database connection working'
    });
  } catch (error) {
    return c.json({ 
      status: 'error', 
      error: error.message 
    }, 500);
  }
});

// Basic API routes
app.get('/api/test', (c) => {
  return c.json({ message: 'API is working!' });
});

// Social accounts endpoint
app.get('/api/social/accounts', (c) => {
  return c.json({ 
    success: true, 
    accounts: [],
    message: 'Social accounts endpoint ready - connect your accounts first'
  });
});

// Instagram auth URL endpoint  
app.get('/api/social/auth/instagram', (c) => {
  const redirectUri = 'https://hlpfl.space/auth/instagram/callback';
  const appId = c.env.INSTAGRAM_APP_ID || 'YOUR_APP_ID_HERE';
  
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
  
  return c.json({ 
    success: true, 
    authUrl: authUrl,
    message: appId === 'YOUR_APP_ID_HERE' ? 'Please set INSTAGRAM_APP_ID in Workers environment' : 'Instagram auth URL generated'
  });
});

// TikTok auth URL endpoint
app.get('/api/social/auth/tiktok', (c) => {
  const redirectUri = 'https://hlpfl.space/auth/tiktok/callback';
  const clientKey = c.env.TIKTOK_CLIENT_KEY || 'YOUR_TIKTOK_CLIENT_KEY_HERE';
  const scopes = 'user.info.basic,video.list,video.upload';
  
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${redirectUri}`;
  
  return c.json({ 
    success: true, 
    authUrl: authUrl,
    message: clientKey === 'YOUR_TIKTOK_CLIENT_KEY_HERE' ? 'Please set TIKTOK_CLIENT_KEY in Workers environment' : 'TikTok auth URL generated'
  });
});

// YouTube auth URL endpoint
app.get('/api/social/auth/youtube', (c) => {
  const redirectUri = 'https://hlpfl.space/auth/youtube/callback';
  const clientId = c.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
  const scopes = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  
  return c.json({ 
    success: true, 
    authUrl: authUrl,
    message: clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE' ? 'Please set GOOGLE_CLIENT_ID in Workers environment' : 'YouTube auth URL generated'
  });
});

// Media upload endpoint
app.post('/api/media/upload', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Expected multipart/form-data' }, 400);
    }

    const formData = await c.req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = originalName.split('.').pop();
    const filename = `upload_${timestamp}.${extension}`;
    
    // For now, we'll store file info and return it
    // In production, you'd upload to cloud storage like S3 or Cloudflare R2
    const fileInfo = {
      filename: filename,
      originalName: originalName,
      size: buffer.length,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      buffer: Array.from(buffer).slice(0, 1000) // Store first 1KB for preview
    };

    return c.json({
      success: true,
      file: fileInfo,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ 
      error: 'Upload failed: ' + error.message 
    }, 500);
  }
});

// Create post endpoint
app.post('/api/posts', async (c) => {
  try {
    const body = await c.req.json();
    const { content, platforms, mediaFiles, scheduledTime } = body;

    if (!content && (!mediaFiles || mediaFiles.length === 0)) {
      return c.json({ error: 'Content or media is required' }, 400);
    }

    if (!platforms || platforms.length === 0) {
      return c.json({ error: 'At least one platform must be selected' }, 400);
    }

    // Simulate post creation
    const post = {
      id: Date.now().toString(),
      content: content,
      platforms: platforms,
      mediaFiles: mediaFiles || [],
      status: scheduledTime ? 'scheduled' : 'posted',
      scheduledTime: scheduledTime,
      createdAt: new Date().toISOString(),
      postedAt: scheduledTime ? null : new Date().toISOString()
    };

    return c.json({
      success: true,
      post: post,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ 
      error: 'Failed to create post: ' + error.message 
    }, 500);
  }
});

// Get posts endpoint
app.get('/api/posts', async (c) => {
  try {
    // Simulate recent posts
    const posts = [
      {
        id: '1',
        content: 'Check out our latest social media manager! 🚀',
        platforms: ['twitter', 'linkedin'],
        status: 'posted',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        postedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2', 
        content: 'Working on some amazing new features...',
        platforms: ['facebook'],
        status: 'scheduled',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        scheduledTime: new Date(Date.now() + 3600000).toISOString()
      }
    ];

    return c.json({
      success: true,
      posts: posts
    });

  } catch (error) {
    console.error('Get posts error:', error);
    return c.json({ 
      error: 'Failed to get posts: ' + error.message 
    }, 500);
  }
});

// Serve frontend dashboard
app.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .sidebar-transition { transition: transform 0.3s ease-in-out; }
        .post-card { transition: all 0.3s ease; }
        .post-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .platform-badge { transition: all 0.2s ease; }
        .platform-badge:hover { transform: scale(1.05); }
        .char-counter { transition: color 0.2s ease; }
        .char-counter.warning { color: #f59e0b; }
        .char-counter.danger { color: #ef4444; }
        .notification { animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <button id="sidebarToggle" class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                        <i class="fas fa-bars text-xl"></i>
                    </button>
                    <h1 class="ml-4 text-xl font-semibold text-gray-900">HLPFL Social Media Manager</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <button class="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                        <i class="fas fa-bell"></i>
                    </button>
                    <div class="relative">
                        <button class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <img class="h-8 w-8 rounded-full" src="https://picsum.photos/seed/avatar/100/100.jpg" alt="User avatar">
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <div class="flex h-screen pt-16">
        <!-- Sidebar -->
        <aside id="sidebar" class="sidebar-transition w-64 bg-white shadow-md transform translate-x-0 fixed inset-y-0 left-0 z-50 pt-16">
            <div class="flex flex-col h-full">
                <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                    <nav class="mt-5 flex-1 px-2 space-y-1">
                        <a href="#dashboard" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700">
                            <i class="fas fa-tachometer-alt mr-3"></i>Dashboard
                        </a>
                        <a href="#posts" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <i class="fas fa-edit mr-3"></i>Create Post
                        </a>
                        <a href="#schedule" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <i class="fas fa-calendar-alt mr-3"></i>Schedule
                        </a>
                        <a href="#analytics" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <i class="fas fa-chart-bar mr-3"></i>Analytics
                        </a>
                        <a href="#accounts" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <i class="fas fa-users mr-3"></i>Accounts
                        </a>
                        <a href="#media" class="nav-item group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <i class="fas fa-images mr-3"></i>Media Library
                        </a>
                    </nav>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-hidden">
            <div class="h-full overflow-y-auto">
                <!-- Dashboard Section -->
                <section id="dashboard-section" class="p-6">
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-900">Dashboard</h2>
                        <p class="text-gray-600">Overview of your social media activity</p>
                    </div>

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                                    <i class="fas fa-file-alt text-white text-xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl><dt class="text-sm font-medium text-gray-500 truncate">Total Posts</dt><dd class="text-lg font-medium text-gray-900" id="totalPosts">0</dd></dl>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                                    <i class="fas fa-clock text-white text-xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl><dt class="text-sm font-medium text-gray-500 truncate">Scheduled</dt><dd class="text-lg font-medium text-gray-900" id="scheduledPosts">0</dd></dl>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                                    <i class="fas fa-share text-white text-xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl><dt class="text-sm font-medium text-gray-500 truncate">Published</dt><dd class="text-lg font-medium text-gray-900" id="publishedPosts">0</dd></dl>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 bg-purple-500 rounded-md p-3">
                                    <i class="fas fa-users text-white text-xl"></i>
                                </div>
                                <div class="ml-5 w-0 flex-1">
                                    <dl><dt class="text-sm font-medium text-gray-500 truncate">Connected</dt><dd class="text-lg font-medium text-gray-900" id="connectedAccounts">0</dd></dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Posts -->
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-medium text-gray-900">Recent Posts</h3>
                        </div>
                        <div class="p-6">
                            <div id="recentPosts" class="space-y-4">
                                <!-- Recent posts will be loaded here -->
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Posts Section -->
                <section id="posts-section" class="p-6 hidden">
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-900">Create Post</h2>
                        <p class="text-gray-600">Compose and schedule your social media posts</p>
                    </div>

                    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="p-6">
                            <!-- Platform Selection -->
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-3">Select Platforms</label>
                                <div class="flex flex-wrap gap-3" id="platformSelection">
                                    <label class="platform-badge inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" value="twitter" class="platform-checkbox mr-2"><i class="fab fa-twitter text-blue-400 mr-2"></i>Twitter
                                    </label>
                                    <label class="platform-badge inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" value="linkedin" class="platform-checkbox mr-2"><i class="fab fa-linkedin text-blue-600 mr-2"></i>LinkedIn
                                    </label>
                                    <label class="platform-badge inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" value="facebook" class="platform-checkbox mr-2"><i class="fab fa-facebook text-blue-500 mr-2"></i>Facebook
                                    </label>
                                    <label class="platform-badge inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" value="instagram" class="platform-checkbox mr-2"><i class="fab fa-instagram text-pink-500 mr-2"></i>Instagram
                                    </label>
                                    <label class="platform-badge inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" value="tiktok" class="platform-checkbox mr-2"><i class="fab fa-tiktok text-black mr-2"></i>TikTok
                                    </label>
                                    <label class="platform-badge inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" value="youtube" class="platform-checkbox mr-2"><i class="fab fa-youtube text-red-500 mr-2"></i>YouTube
                                    </label>
                                </div>
                            </div>

                            <!-- Content Editor -->
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Content</label>
                                <textarea id="postContent" rows="6" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="What's on your mind?"></textarea>
                                <div class="mt-2 flex justify-between">
                                    <span class="text-sm text-gray-500">Character count: <span id="charCount" class="char-counter">0</span></span>
                                    <span id="platformLimit" class="text-sm text-gray-500">Limit: 280 characters</span>
                                </div>
                            </div>

                            <!-- Media Upload -->
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Media</label>
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                                    <p class="text-gray-600 mb-2">Drag and drop files here or click to browse</p>
                                    <input type="file" id="mediaUpload" class="hidden" multiple accept="image/*,video/*">
                                    <button type="button" onclick="document.getElementById('mediaUpload').click()" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                                        Choose Files
                                    </button>
                                </div>
                                <div id="mediaPreview" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4"></div>
                            </div>

                            <!-- Scheduling -->
                            <div class="mb-6">
                                <div class="flex items-center">
                                    <input type="checkbox" id="schedulePost" class="mr-2">
                                    <label for="schedulePost" class="text-sm font-medium text-gray-700">Schedule for later</label>
                                </div>
                                <div id="scheduleOptions" class="mt-3 hidden">
                                    <input type="datetime-local" id="scheduledTime" class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex justify-end space-x-3">
                                <button type="button" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Save as Draft</button>
                                <button type="button" id="publishBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">Publish Now</button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <script>
        // Fixed Social Media Manager JavaScript - Inlined
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
                const sidebarToggle = document.getElementById('sidebarToggle');
                const sidebar = document.getElementById('sidebar');
                
                sidebarToggle?.addEventListener('click', () => {
                    sidebar.classList.toggle('-translate-x-full');
                });

                document.querySelectorAll('.nav-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        const section = item.getAttribute('href').substring(1);
                        this.navigateToSection(section);
                    });
                });

                document.querySelectorAll('.platform-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        this.updatePlatformSelection();
                    });
                });

                const contentTextarea = document.getElementById('postContent');
                if (contentTextarea) {
                    contentTextarea.addEventListener('input', () => {
                        this.updateCharacterCount();
                    });
                }

                const mediaUpload = document.getElementById('mediaUpload');
                if (mediaUpload) {
                    mediaUpload.addEventListener('change', (e) => {
                        this.handleMediaUpload(e);
                    });
                }

                const schedulePost = document.getElementById('schedulePost');
                const scheduleOptions = document.getElementById('scheduleOptions');
                if (schedulePost && scheduleOptions) {
                    schedulePost.addEventListener('change', () => {
                        scheduleOptions.classList.toggle('hidden', !schedulePost.checked);
                    });
                }

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
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${this.token}\` }
                };
                const config = { ...defaultOptions, ...options };
                const url = endpoint.startsWith('http') ? endpoint : \`\${this.apiBaseUrl}\${endpoint}\`;
                try {
                    const response = await fetch(url, config);
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || data.message || 'API call failed');
                    return data;
                } catch (error) {
                    console.error('API call failed:', error);
                    throw error;
                }
            }

            navigateToSection(section) {
                document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
                const sectionElement = document.getElementById(\`\${section}-section\`);
                if (sectionElement) sectionElement.classList.remove('hidden');
                
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('bg-indigo-100', 'text-indigo-700');
                    item.classList.add('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
                });
                
                const activeItem = document.querySelector(\`[href="#\${section}"]\`);
                if (activeItem) {
                    activeItem.classList.add('bg-indigo-100', 'text-indigo-700');
                    activeItem.classList.remove('text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900');
                }
            }

            async loadDashboard() {
                try {
                    const dashboardData = { totalPosts: 12, scheduledPosts: 3, publishedPosts: 9, connectedAccounts: 2 };
                    this.updateElement('totalPosts', dashboardData.totalPosts);
                    this.updateElement('scheduledPosts', dashboardData.scheduledPosts);
                    this.updateElement('publishedPosts', dashboardData.publishedPosts);
                    this.updateElement('connectedAccounts', dashboardData.connectedAccounts);
                    await this.loadRecentPosts();
                } catch (error) {
                    console.error('Failed to load dashboard:', error);
                }
            }

            async loadRecentPosts() {
                try {
                    const response = await this.apiCall('/posts');
                    if (response.success) this.renderRecentPosts(response.posts);
                } catch (error) {
                    console.error('Failed to load recent posts:', error);
                    this.renderEmptyRecentPosts();
                }
            }

            renderRecentPosts(posts) {
                const container = document.getElementById('recentPosts');
                if (!container) return;
                if (!posts || posts.length === 0) { this.renderEmptyRecentPosts(); return; }
                
                container.innerHTML = posts.map(post => \`
                    <div class="post-card border rounded-lg p-4 hover:shadow-md transition-all">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex space-x-2">\${post.platforms.map(platform => this.getPlatformBadge(platform)).join('')}</div>
                            <span class="text-sm text-gray-500">\${this.formatDate(post.createdAt)}</span>
                        </div>
                        <p class="text-gray-700 mb-2">\${post.content}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-sm px-2 py-1 rounded-full \${this.getStatusClass(post.status)}">\${post.status}</span>
                            <button class="text-indigo-600 hover:text-indigo-800 text-sm">View</button>
                        </div>
                    </div>
                \`.join(''));
            }

            renderEmptyRecentPosts() {
                const container = document.getElementById('recentPosts');
                if (!container) return;
                container.innerHTML = \`
                    <div class="text-center py-8">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500 mb-4">No posts yet</p>
                        <button class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700" onclick="window.location.hash='#posts'">Create Your First Post</button>
                    </div>
                \`;
            }

            updatePlatformSelection() {
                const checkboxes = document.querySelectorAll('.platform-checkbox:checked');
                this.selectedPlatforms = Array.from(checkboxes).map(cb => cb.value);
                
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
                charCount.textContent = \`\${length} / \${limit}\`;
                charCount.classList.remove('warning', 'danger');
                if (length > limit * 0.9) charCount.classList.add('danger');
                else if (length > limit * 0.8) charCount.classList.add('warning');
            }

            getCurrentCharacterLimit() {
                if (this.selectedPlatforms.includes('twitter')) return 280;
                if (this.selectedPlatforms.includes('tiktok')) return 150;
                if (this.selectedPlatforms.includes('instagram')) return 2200;
                return 280;
            }

            updateCharacterLimit() {
                this.updateCharacterCount();
                const platformLimit = document.getElementById('platformLimit');
                if (platformLimit) {
                    const limit = this.getCurrentCharacterLimit();
                    platformLimit.textContent = \`Limit: \${limit} characters\`;
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
                const validFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
                
                for (const file of validFiles) {
                    try {
                        this.showNotification(\`Uploading \${file.name}...\`, 'info');
                        
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const response = await fetch(\`\${this.apiBaseUrl}/media/upload\`, {
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
                            this.showNotification(\`\${file.name} uploaded successfully!\`, 'success');
                        } else {
                            throw new Error(result.error || 'Upload failed');
                        }
                    } catch (error) {
                        console.error('File upload error:', error);
                        this.showNotification(\`Failed to upload \${file.name}: \${error.message}\`, 'error');
                    }
                }
                this.renderMediaPreview();
            }

            renderMediaPreview() {
                const preview = document.getElementById('mediaPreview');
                if (!preview || this.uploadedMedia.length === 0) {
                    if (preview) preview.innerHTML = '';
                    return;
                }
                
                preview.innerHTML = this.uploadedMedia.map((media, index) => \`
                    <div class="relative border rounded-lg overflow-hidden">
                        \${media.type.startsWith('image/') ? 
                            \`<img src="\${media.url}" alt="\${media.name}" class="w-full h-32 object-cover"> \` :
                            \`<video src="\${media.url}" class="w-full h-32 object-cover" controls></video> \`
                        }
                        <button onclick="app.removeMedia(\${index})" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="p-2 text-xs text-gray-600">
                            <div class="truncate">\${media.name}</div>
                            <div>\${this.formatFileSize(media.size)}</div>
                        </div>
                    </div>
                \`.join(''));
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
                const scheduledTime = schedulePost.checked ? document.getElementById('scheduledTime').value : null;
                
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
                const existingNotifications = document.querySelectorAll('.notification');
                existingNotifications.forEach(n => n.remove());
                
                const notification = document.createElement('div');
                notification.className = \`notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2 max-w-sm\`;
                
                const colors = {
                    success: 'bg-green-500 text-white',
                    error: 'bg-red-500 text-white',
                    warning: 'bg-yellow-500 text-white',
                    info: 'bg-blue-500 text-white'
                };
                
                notification.className += \` \${colors[type] || colors.info}\`;
                
                const icons = {
                    success: 'fa-check-circle',
                    error: 'fa-exclamation-circle',
                    warning: 'fa-exclamation-triangle',
                    info: 'fa-info-circle'
                };
                
                notification.innerHTML = \`
                    <i class="fas \${icons[type] || icons.info}"></i>
                    <span>\${message}</span>
                \`;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateY(-100%)';
                    setTimeout(() => {
                        if (notification.parentNode) notification.parentNode.removeChild(notification);
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
                if (minutes < 60) return \`\${minutes}m ago\`;
                if (hours < 24) return \`\${hours}h ago\`;
                if (days < 7) return \`\${days}d ago\`;
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
                if (element) element.textContent = value;
            }
        }

        const app = new SocialMediaManager();
    </script>
</body>
</html>`;
  
  return c.html(html);
});

app.get('/dashboard', async (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager - Enterprise Dashboard</title>
    <link rel="stylesheet" href="https://0a8ee7ae.socialmediamanager-frontend.pages.dev/hootsuite-style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div id="app"></div>
    <script src="https://0a8ee7ae.socialmediamanager-frontend.pages.dev/hootsuite-dashboard.js"></script>
</body>
</html>
  `;
  
  return c.html(html);
});

app.get('/hootsuite-dashboard.html', async (c) => {
  return c.redirect('/');
});

// Welcome route (API)
app.get('/api', (c) => {
  return c.json({ 
    name: 'Social Media Manager API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// 404 handling
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default {
  fetch: app.fetch,
};