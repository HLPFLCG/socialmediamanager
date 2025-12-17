// Additional API Endpoints for Social Media Manager
// These should be added to index.js before the error handlers

// Analytics endpoint
app.get('/api/analytics', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { startDate, endDate, platform } = c.req.query();
    
    // Get all posts for the user
    const posts = await d1Service.getPosts(user.id, 1000);
    
    // Calculate analytics
    const analytics = {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'published').length,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
      draftPosts: posts.filter(p => p.status === 'draft').length,
      platformBreakdown: {},
      engagementMetrics: {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0
      },
      recentActivity: posts.slice(0, 10).map(post => ({
        id: post.id,
        content: post.content.substring(0, 100),
        platforms: JSON.parse(post.platforms),
        status: post.status,
        created_at: post.created_at
      }))
    };
    
    // Calculate platform breakdown
    posts.forEach(post => {
      const platforms = JSON.parse(post.platforms);
      platforms.forEach(platform => {
        analytics.platformBreakdown[platform] = (analytics.platformBreakdown[platform] || 0) + 1;
      });
      
      // Add engagement metrics if available
      if (post.metrics) {
        const metrics = JSON.parse(post.metrics);
        analytics.engagementMetrics.totalViews += metrics.views || 0;
        analytics.engagementMetrics.totalLikes += metrics.likes || 0;
        analytics.engagementMetrics.totalShares += metrics.shares || 0;
        analytics.engagementMetrics.totalComments += metrics.comments || 0;
      }
    });
    
    return c.json({ success: true, analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ error: 'Failed to load analytics: ' + error.message }, 500);
  }
});

// Schedule post endpoint
app.post('/api/posts/schedule', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { content, platforms, scheduled_at, media_urls } = await c.req.json();
    
    if (!content || !platforms || !scheduled_at) {
      return c.json({ error: 'Content, platforms, and scheduled time are required' }, 400);
    }
    
    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return c.json({ error: 'Scheduled time must be in the future' }, 400);
    }
    
    const postData = {
      user_id: user.id,
      content,
      platforms: JSON.stringify(platforms),
      media_urls: media_urls ? JSON.stringify(media_urls) : null,
      status: 'scheduled',
      scheduled_at: scheduled_at
    };
    
    const result = await d1Service.createPost(postData);
    
    return c.json({
      success: true,
      message: 'Post scheduled successfully',
      post: {
        id: result.lastRowId,
        ...postData,
        platforms: JSON.parse(postData.platforms),
        media_urls: postData.media_urls ? JSON.parse(postData.media_urls) : []
      }
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    return c.json({ error: 'Failed to schedule post: ' + error.message }, 500);
  }
});

// Get scheduled posts
app.get('/api/posts/scheduled', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const posts = await d1Service.getPosts(user.id, 100);
    const scheduledPosts = posts
      .filter(post => post.status === 'scheduled')
      .map(post => ({
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : []
      }));
    
    return c.json({ success: true, posts: scheduledPosts });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    return c.json({ error: 'Failed to get scheduled posts: ' + error.message }, 500);
  }
});

// User settings endpoints
app.get('/api/user/settings', authenticate, async (c) => {
  const user = c.get('user');
  
  return c.json({
    success: true,
    settings: {
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      notifications: {
        email: true,
        push: false,
        postPublished: true,
        postScheduled: true
      },
      timezone: 'UTC',
      language: 'en'
    }
  });
});

app.put('/api/user/settings', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { name, avatar_url, notifications, timezone, language } = await c.req.json();
    
    const updateData = {};
    if (name) updateData.name = name;
    if (avatar_url) updateData.avatar_url = avatar_url;
    
    if (Object.keys(updateData).length > 0) {
      await d1Service.updateUser(user.id, updateData);
    }
    
    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        email: user.email,
        name: name || user.name,
        avatar_url: avatar_url || user.avatar_url,
        notifications: notifications || { email: true, push: false },
        timezone: timezone || 'UTC',
        language: language || 'en'
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Failed to update settings: ' + error.message }, 500);
  }
});

// Change password endpoint
app.post('/api/user/change-password', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { currentPassword, newPassword } = await c.req.json();
    
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current and new password are required' }, 400);
    }
    
    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters long' }, 400);
    }
    
    // Verify current password
    const dbUser = await d1Service.getUserById(user.id);
    const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
    
    if (!passwordMatch) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await d1Service.updateUser(user.id, { password: hashedPassword });
    
    return c.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password: ' + error.message }, 500);
  }
});

// Delete social account
app.delete('/api/social/accounts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const accountId = c.req.param('id');
  
  try {
    await d1Service.deleteSocialAccount(accountId);
    
    return c.json({
      success: true,
      message: 'Social account disconnected successfully'
    });
  } catch (error) {
    console.error('Delete social account error:', error);
    return c.json({ error: 'Failed to disconnect account: ' + error.message }, 500);
  }
});

// Get post by ID
app.get('/api/posts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const post = await d1Service.getPost(postId, user.id);
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    return c.json({
      success: true,
      post: {
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
        metrics: post.metrics ? JSON.parse(post.metrics) : {}
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ error: 'Failed to get post: ' + error.message }, 500);
  }
});

// Update scheduled post
app.put('/api/posts/scheduled/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const { content, platforms, scheduled_at, media_urls } = await c.req.json();
    
    const updateData = {};
    if (content) updateData.content = content;
    if (platforms) updateData.platforms = JSON.stringify(platforms);
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (scheduledDate <= new Date()) {
        return c.json({ error: 'Scheduled time must be in the future' }, 400);
      }
      updateData.scheduled_at = scheduled_at;
    }
    if (media_urls) updateData.media_urls = JSON.stringify(media_urls);
    
    await d1Service.updatePost(postId, user.id, updateData);
    
    return c.json({
      success: true,
      message: 'Scheduled post updated successfully'
    });
  } catch (error) {
    console.error('Update scheduled post error:', error);
    return c.json({ error: 'Failed to update scheduled post: ' + error.message }, 500);
  }
});

// Cancel scheduled post
app.delete('/api/posts/scheduled/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    await d1Service.deletePost(postId, user.id);
    
    return c.json({
      success: true,
      message: 'Scheduled post cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel scheduled post error:', error);
    return c.json({ error: 'Failed to cancel scheduled post: ' + error.message }, 500);
  }
});