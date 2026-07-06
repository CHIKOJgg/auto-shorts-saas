const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { generateDescriptionAndTags } = require('../services/aiService');
const { saveUpload } = require('../db/database');
const { validateTitle } = require('../utils/validation');
const { validateVideoFile } = require('../utils/fileValidator');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID();
    cb(null, unique + path.extname(file.originalname));
  },
});

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const MAX_SIZE = 50 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`));
    }
  },
});

function removeFile(filepath) {
  try {
    if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (_) {
    /* cleanup failures are non-fatal */
  }
}

router.post('/', (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(err.status || 400).json({ error: err.message });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No video file provided.');
    }

    const titleResult = validateTitle(req.body.title);
    if (!titleResult.valid) {
      removeFile(req.file.path);
      throw new AppError(titleResult.error);
    }

    const header = fs.readFileSync(req.file.path, { length: 12 });
    if (!validateVideoFile(header, req.file.mimetype)) {
      removeFile(req.file.path);
      throw new AppError('File content does not match the declared video type.');
    }

    const aiResult = await generateDescriptionAndTags(titleResult.value);

    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    await saveUpload({
      filename: req.file.filename,
      originalName: req.file.originalname,
      title: titleResult.value,
      description: aiResult.description,
      tags: aiResult.tags,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ipAddress,
    });

    res.json({
      videoUrl: `/uploads/${req.file.filename}`,
      title: titleResult.value,
      description: aiResult.description,
      tags: aiResult.tags,
    });
  } catch (err) {
    if (req.file) {
      removeFile(req.file.path);
    }
    next(err);
  }
});

module.exports = router;
