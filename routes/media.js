const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const router = express.Router();

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10
  }
});

router.post('/upload', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        return stats.isFile();
      })
      .map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${file}`
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;