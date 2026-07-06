const { deleteOldUploads } = require('../db/database');

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

let intervalHandle = null;

function startCleanupScheduler() {
  if (intervalHandle) return;

  const run = () => {
    try {
      const result = deleteOldUploads(RETENTION_DAYS);
      if (result.dbRecordsDeleted > 0 || result.filesDeleted > 0) {
        console.log(
          `[cleanup] Deleted ${result.dbRecordsDeleted} DB records and ${result.filesDeleted} files`
        );
      }
    } catch (err) {
      console.error('[cleanup] Error during scheduled cleanup:', err.message);
    }
  };

  run();
  intervalHandle = setInterval(run, CLEANUP_INTERVAL_MS);
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
