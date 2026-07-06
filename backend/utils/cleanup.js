const fs = require('fs');
const path = require('path');
const { deleteOldUploads } = require('../db/database');
const db = require('../db/knex');

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

let intervalHandle = null;

async function runCleanup() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
    const oldUploads = await db('uploads').where('created_at', '<', cutoff).select('filename');
    const deletedCount = await deleteOldUploads(RETENTION_DAYS);

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    let filesDeleted = 0;
    for (const upload of oldUploads) {
      const filepath = path.join(uploadsDir, upload.filename);
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          filesDeleted++;
        }
      } catch (_) {}
    }

    if (deletedCount > 0 || filesDeleted > 0) {
      console.log(`[cleanup] Deleted ${deletedCount} DB records and ${filesDeleted} files`);
    }
  } catch (err) {
    console.error('[cleanup] Error during scheduled cleanup:', err.message);
  }
}

function startCleanupScheduler() {
  if (intervalHandle) return;
  runCleanup();
  intervalHandle = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  if (intervalHandle.unref) {
    intervalHandle.unref();
  }
}

function stopCleanupScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startCleanupScheduler, stopCleanupScheduler };
