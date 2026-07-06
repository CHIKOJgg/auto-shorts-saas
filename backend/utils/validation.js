const VALID_TITLE_MAX = 200;

function validateTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required.' };
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Title must not be empty.' };
  }
  if (trimmed.length > VALID_TITLE_MAX) {
    return { valid: false, error: `Title must be ${VALID_TITLE_MAX} characters or less.` };
  }
  return { valid: true, value: trimmed };
}

function validatePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

module.exports = { validateTitle, validatePagination, VALID_TITLE_MAX };
