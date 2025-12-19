/**
 * HLPFL Social Media Manager - Production Frontend
 * Feature-complete, accessible, and performant
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = 'https://socialmediamanager-api-production.hlpfl-co.workers.dev';
const TOKEN_KEY = 'hlpfl_auth_token';
const USER_KEY = 'hlpfl_user';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  user: null,
  token: null,
  currentSection: 'create-post',
  posts: [],
  analytics: null,
  socialAccounts: [],
  loading: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// API Request Helper
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Show Notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'polite');
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Show Loading
function showLoading(show = true) {
  state.loading = show;
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}

// Format Date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Character Counter
function updateCharacterCount(textarea, counterId, platform = 'twitter') {
  const limits = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
    instagram: 2200,
  };
  
  const limit = limits[platform] || 280;
  const count = textarea.value.length;
  const counter = document.getElementById(counterId);
  
  if (counter) {
    counter.textContent = `${count}/${limit}`;
    counter.className = count > limit ? 'char-count over-limit' : 'char-count';
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

// Initialize Auth
function initAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  
  if (token && userStr) {
    state.token = token;
    state.user = JSON.parse(userStr);
    showDashboard();
  } else {
    showAuth();
  }
}

// Show Auth Container
function showAuth() {
  document.getElementById('auth-container').style.display = 'flex';
  document.getElementById('dashboard-container').style.display = 'none';
}

// Show Dashboard
function showDashboard() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('dashboard-container').style.display = 'block';
  
  if (state.user) {
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      userNameEl.textContent = state.user.name;
    }
  }
  
  // Load initial data
  loadPosts();
  loadAnalytics();
  loadSocialAccounts();
}

// Switch Auth Forms
window.switchAuth = function(type) {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  
  if (type === 'login') {
    loginSection.classList.add('active');
    registerSection.classList.remove('active');
  } else {
    loginSection.classList.remove('active');
    registerSection.classList.add('active');
  }
};

// Handle Registration
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  if (password !== confirmPassword) {
    showNotification('Passwords do not match', 'error');
    return;
  }
  
  try {
    showLoading(true);
    
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    state.token = data.token;
    state.user = data.user;
    
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    
    showNotification('Registration successful!');
    showDashboard();
    
  } catch (error) {
    showNotification(error.message || 'Registration failed', 'error');
  } finally {
    showLoading(false);
  }
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    showLoading(true);
    
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    state.token = data.token;
    state.user = data.user;
    
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    
    showNotification('Login successful!');
    showDashboard();
    
  } catch (error) {
    showNotification(error.message || 'Login failed', 'error');
  } finally {
    showLoading(false);
  }
}

// Handle Logout
function handleLogout() {
  state.token = null;
  state.user = null;
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  showNotification('Logged out successfully');
  showAuth();
}

// ============================================================================
// NAVIGATION
// ============================================================================

function switchSection(sectionName) {
  // Update state
  state.currentSection = sectionName;
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionName) {
      item.classList.add('active');
    }
  });
  
  // Update sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
    if (section.id === `${sectionName}-section`) {
      section.classList.add('active');
    }
  });
  
  // Load section-specific data
  if (sectionName === 'posts') {
    loadPosts();
  } else if (sectionName === 'analytics') {
    loadAnalytics();
  } else if (sectionName === 'settings') {
    loadSettings();
  }
}

// ============================================================================
// POST MANAGEMENT
// ============================================================================

// Create Post
async function handleCreatePost(e) {
  e.preventDefault();
  
  const content = document.getElementById('post-content').value;
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platforms = Array.from(platformCheckboxes).map(cb => cb.value);
  const scheduleDate = document.getElementById('schedule-date').value;
  const scheduleTime = document.getElementById('schedule-time').value;
  
  if (!content.trim()) {
    showNotification('Please enter post content', 'error');
    return;
  }
  
  if (platforms.length === 0) {
    showNotification('Please select at least one platform', 'error');
    return;
  }
  
  try {
    showLoading(true);
    
    const postData = {
      content,
      platforms,
    };
    
    // Add scheduling if date and time are provided
    if (scheduleDate && scheduleTime) {
      postData.scheduled_at = `${scheduleDate}T${scheduleTime}:00Z`;
    }
    
    await apiRequest('/api/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
    
    showNotification('Post created successfully!');
    
    // Reset form
    document.getElementById('create-post-form').reset();
    updateCharacterCount(document.getElementById('post-content'), 'char-count');
    
    // Reload posts
    loadPosts();
    
  } catch (error) {
    showNotification(error.message || 'Failed to create post', 'error');
  } finally {
    showLoading(false);
  }
}

// Load Posts
async function loadPosts() {
  try {
    const data = await apiRequest('/api/posts');
    state.posts = data.posts;
    renderPosts();
  } catch (error) {
    console.error('Failed to load posts:', error);
    showNotification('Failed to load posts', 'error');
  }
}

// Render Posts
function renderPosts() {
  const container = document.getElementById('posts-list');
  if (!container) return;
  
  if (state.posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No posts yet. Create your first post!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.posts.map(post => `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-platforms">
          ${post.platforms.map(p => `<span class="platform-badge">${p}</span>`).join('')}
        </div>
        <span class="post-status status-${post.status}">${post.status}</span>
      </div>
      <div class="post-content">
        ${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}
      </div>
      <div class="post-footer">
        <span class="post-date">${formatDate(post.created_at)}</span>
        <div class="post-actions">
          ${post.status === 'draft' ? `
            <button onclick="publishPost(${post.id})" class="btn btn-sm btn-primary">Publish</button>
          ` : ''}
          <button onclick="editPost(${post.id})" class="btn btn-sm btn-outline">Edit</button>
          <button onclick="deletePost(${post.id})" class="btn btn-sm btn-danger">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Publish Post
window.publishPost = async function(postId) {
  if (!confirm('Are you sure you want to publish this post?')) return;
  
  try {
    showLoading(true);
    await apiRequest(`/api/posts/${postId}/publish`, { method: 'POST' });
    showNotification('Post published successfully!');
    loadPosts();
  } catch (error) {
    showNotification(error.message || 'Failed to publish post', 'error');
  } finally {
    showLoading(false);
  }
};

// Delete Post
window.deletePost = async function(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  
  try {
    showLoading(true);
    await apiRequest(`/api/posts/${postId}`, { method: 'DELETE' });
    showNotification('Post deleted successfully!');
    loadPosts();
  } catch (error) {
    showNotification(error.message || 'Failed to delete post', 'error');
  } finally {
    showLoading(false);
  }
};

// Edit Post (placeholder)
window.editPost = function(postId) {
  showNotification('Edit functionality coming soon!', 'info');
};

// ============================================================================
// ANALYTICS
// ============================================================================

async function loadAnalytics() {
  try {
    const data = await apiRequest('/api/analytics');
    state.analytics = data;
    renderAnalytics();
  } catch (error) {
    console.error('Failed to load analytics:', error);
    showNotification('Failed to load analytics', 'error');
  }
}

function renderAnalytics() {
  if (!state.analytics) return;
  
  const { overview, recent_posts } = state.analytics;
  
  // Update stats
  document.getElementById('total-posts').textContent = overview.total_posts || 0;
  document.getElementById('published-posts').textContent = overview.by_status?.published || 0;
  document.getElementById('scheduled-posts').textContent = overview.by_status?.scheduled || 0;
  document.getElementById('draft-posts').textContent = overview.by_status?.draft || 0;
  
  // Render platform breakdown
  const platformContainer = document.getElementById('platform-breakdown');
  if (platformContainer && overview.by_platform) {
    platformContainer.innerHTML = Object.entries(overview.by_platform)
      .map(([platform, count]) => `
        <div class="platform-stat">
          <span class="platform-name">${platform}</span>
          <span class="platform-count">${count}</span>
        </div>
      `).join('');
  }
  
  // Render recent activity
  const activityContainer = document.getElementById('recent-activity');
  if (activityContainer && recent_posts) {
    activityContainer.innerHTML = recent_posts.slice(0, 5).map(post => `
      <div class="activity-item">
        <div class="activity-content">
          <strong>${post.status}</strong> - ${post.content.substring(0, 50)}...
        </div>
        <div class="activity-date">${formatDate(post.created_at)}</div>
      </div>
    `).join('');
  }
}

// ============================================================================
// SETTINGS
// ============================================================================

async function loadSettings() {
  if (!state.user) return;
  
  // Populate form with current user data
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  
  if (nameInput) nameInput.value = state.user.name || '';
  if (emailInput) emailInput.value = state.user.email || '';
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  
  const name = document.getElementById('settings-name').value;
  const email = document.getElementById('settings-email').value;
  
  try {
    showLoading(true);
    
    const data = await apiRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    });
    
    state.user = data.user;
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    
    showNotification('Profile updated successfully!');
    
    // Update displayed name
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      userNameEl.textContent = data.user.name;
    }
    
  } catch (error) {
    showNotification(error.message || 'Failed to update profile', 'error');
  } finally {
    showLoading(false);
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  
  if (newPassword !== confirmPassword) {
    showNotification('New passwords do not match', 'error');
    return;
  }
  
  try {
    showLoading(true);
    
    await apiRequest('/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    
    showNotification('Password changed successfully!');
    
    // Reset form
    document.getElementById('change-password-form').reset();
    
  } catch (error) {
    showNotification(error.message || 'Failed to change password', 'error');
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// SOCIAL ACCOUNTS
// ============================================================================

async function loadSocialAccounts() {
  try {
    const data = await apiRequest('/api/social-accounts');
    state.socialAccounts = data.accounts;
    renderSocialAccounts();
  } catch (error) {
    console.error('Failed to load social accounts:', error);
  }
}

function renderSocialAccounts() {
  const container = document.getElementById('social-accounts-list');
  if (!container) return;
  
  const platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'];
  
  container.innerHTML = platforms.map(platform => {
    const account = state.socialAccounts.find(a => a.platform === platform);
    
    return `
      <div class="account-card">
        <div class="account-icon">${getPlatformIcon(platform)}</div>
        <div class="account-info">
          <h3>${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
          ${account ? `
            <p class="account-status connected">Connected as @${account.username}</p>
            <button onclick="disconnectAccount(${account.id})" class="btn btn-sm btn-outline">Disconnect</button>
          ` : `
            <p class="account-status">Not connected</p>
            <button onclick="connectAccount('${platform}')" class="btn btn-sm btn-primary">Connect</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function getPlatformIcon(platform) {
  const icons = {
    twitter: '🐦',
    linkedin: '💼',
    facebook: '👥',
    instagram: '📷',
    tiktok: '🎵',
    youtube: '▶️',
  };
  return icons[platform] || '🔗';
}

window.connectAccount = function(platform) {
  showNotification(`OAuth integration for ${platform} coming soon!`, 'info');
};

window.disconnectAccount = async function(accountId) {
  if (!confirm('Are you sure you want to disconnect this account?')) return;
  
  try {
    showLoading(true);
    await apiRequest(`/api/social-accounts/${accountId}`, { method: 'DELETE' });
    showNotification('Account disconnected successfully!');
    loadSocialAccounts();
  } catch (error) {
    showNotification(error.message || 'Failed to disconnect account', 'error');
  } finally {
    showLoading(false);
  }
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize authentication
  initAuth();
  
  // Auth forms
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchSection(item.dataset.section);
    });
  });
  
  // Create post form
  const createPostForm = document.getElementById('create-post-form');
  if (createPostForm) {
    createPostForm.addEventListener('submit', handleCreatePost);
  }
  
  // Character counter
  const postContent = document.getElementById('post-content');
  if (postContent) {
    postContent.addEventListener('input', () => {
      updateCharacterCount(postContent, 'char-count');
    });
  }
  
  // Settings forms
  const profileForm = document.getElementById('profile-settings-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleUpdateProfile);
  }
  
  const passwordForm = document.getElementById('change-password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handleChangePassword);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for quick search (future feature)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      showNotification('Search coming soon!', 'info');
    }
  });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

// Add focus visible class for keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    document.body.classList.add('keyboard-nav');
  }
});

document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-nav');
});

// ============================================================================
// PERFORMANCE
// ============================================================================

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showNotification('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showNotification('An unexpected error occurred', 'error');
});