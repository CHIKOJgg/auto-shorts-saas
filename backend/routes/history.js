const express = require('express');
const { listUploads, getUpload, countUploads } = require('../db/database');
const { validatePagination } = require('../utils/validation');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const { limit, offset } = validatePagination(req.query);
    const uploads = listUploads({ limit, offset });
    const total = countUploads();
    res.json({ data: uploads, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const upload = getUpload(id);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    res.json(upload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
