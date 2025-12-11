const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  mediaUrls: [{
    type: String
  }],
  platforms: [{
    type: String,
    enum: ['twitter', 'linkedin', 'facebook', 'instagram']
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'posted', 'failed', 'pending'],
    default: 'draft'
  },
  scheduledFor: {
    type: Date
  },
  postedAt: {
    type: Date
  },
  platformPosts: [{
    platform: {
      type: String,
      required: true
    },
    platformPostId: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'posted', 'failed'],
      default: 'pending'
    },
    postedAt: {
      type: Date
    },
    error: {
      type: String
    },
    metrics: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  categories: [{
    type: String,
    trim: true
  }],
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateName: {
    type: String
  }
}, {
  timestamps: true
});

postSchema.index({ userId: 1, status: 1 });
postSchema.index({ scheduledFor: 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);