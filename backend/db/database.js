const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shorts.db');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate();
  }
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      file_size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);
  `);
}

function saveUpload({ filename, originalName, title, description, tags, fileSize, mimeType, ipAddress }) {
  const stmt = getDb().prepare(`
    INSERT INTO uploads (filename, original_name, title, description, tags, file_size, mime_type, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(filename, originalName, title, description, JSON.stringify(tags), fileSize, mimeType, ipAddress);
  return result.lastInsertRowid;
}

function getUpload(id) {
  const row = getDb().prepare('SELECT * FROM uploads WHERE id = ?').get(id);
  if (row) {
    row.tags = JSON.parse(row.tags);
  }
  return row;
}

function listUploads({ limit = 20, offset = 0 } = {}) {
  const rows = getDb().prepare(
    'SELECT * FROM uploads ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
  return rows.map(r => ({ ...r, tags: JSON.parse(r.tags) }));
}

function countUploads() {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM uploads').get();
  return row.count;
}

function deleteOldUploads(olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  const rows = getDb().prepare(
    'SELECT filename FROM uploads WHERE created_at < ?'
  ).all(cutoff);
  const deleteStmt = getDb().prepare('DELETE FROM uploads WHERE created_at < ?');
  const result = deleteStmt.run(cutoff);

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  let filesDeleted = 0;
  for (const row of rows) {
    const filepath = path.join(uploadsDir, row.filename);
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        filesDeleted++;
      }
    } catch (err) {
      console.error('Failed to delete file:', filepath, err.message);
    }
  }

  return {
    dbRecordsDeleted: result.changes,
    filesDeleted,
    files: rows.map(r => r.filename),
  };
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, saveUpload, getUpload, listUploads, countUploads, deleteOldUploads, closeDb };
