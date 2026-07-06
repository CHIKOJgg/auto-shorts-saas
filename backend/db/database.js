const db = require('./knex');

function saveUpload({ userId = null, filename, originalName, title, description, tags, fileSize, mimeType, ipAddress }) {
  const insertData = {
    filename,
    original_name: originalName,
    title,
    description,
    tags: db.raw('ARRAY[?]::text[]', [tags]),
    file_size: fileSize,
    mime_type: mimeType,
    ip_address: ipAddress,
  };
  if (userId) insertData.user_id = userId;
  return db('uploads').insert(insertData).returning('id');
}

function parseRow(row) {
  if (!row) return null;
  if (typeof row.tags === 'string') {
    row.tags = row.tags.replace(/[{}]/g, '').split(',').filter(Boolean);
  }
  return row;
}

async function getUpload(id) {
  const row = await db('uploads').where({ id }).first();
  return parseRow(row);
}

async function listUploads({ limit = 20, offset = 0, userId } = {}) {
  let query = db('uploads').orderBy('created_at', 'desc');
  if (userId) {
    query = query.where({ user_id: userId });
  }
  const rows = await query.limit(limit).offset(offset);
  return rows.map(parseRow);
}

async function countUploads(userId) {
  const query = userId
    ? db('uploads').where({ user_id: userId }).count('* as count').first()
    : db('uploads').count('* as count').first();
  const result = await query;
  return parseInt(result.count, 10);
}

async function countUserUploadsThisMonth(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const result = await db('uploads')
    .where({ user_id: userId })
    .where('created_at', '>=', startOfMonth.toISOString())
    .count('* as count')
    .first();
  return parseInt(result.count, 10);
}

function deleteOldUploads(olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  return db('uploads').where('created_at', '<', cutoff).del();
}

function closeDb() {
  return db.destroy();
}

module.exports = { saveUpload, getUpload, listUploads, countUploads, countUserUploadsThisMonth, deleteOldUploads, closeDb };
