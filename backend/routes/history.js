const express = require('express');
const { listUploads, getUpload, countUploads } = require('../db/database');
const { validatePagination } = require('../utils/validation');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = validatePagination(req.query);
    const [uploads, total] = await Promise.all([
      listUploads({ limit, offset }),
      countUploads(),
    ]);
    res.json({ data: uploads, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const upload = await getUpload(id);
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    res.json(upload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
