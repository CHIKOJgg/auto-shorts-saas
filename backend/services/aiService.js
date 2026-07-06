const OpenAI = require('openai');
const { AppError } = require('../middleware/errorHandler');

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

let client = null;

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-your-key-here') {
    throw new AppError('OpenAI API key is not configured.', 503);
  }
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

function parseTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.slice(0, 5).map(t => String(t).trim());
}

async function generateDescriptionAndTags(title) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new AppError('Title is required and must be a non-empty string');
  }

  const trimmedTitle = title.trim();

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getClient();
      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You generate YouTube Shorts metadata. Always respond with valid JSON in the format: {"description":"...", "tags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}. Description must be one sentence, max 200 characters. Tags must be 5 relevant hashtags.',
          },
          {
            role: 'user',
            content: `Title: "${trimmedTitle}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const text = resp.choices[0]?.message?.content;
      if (!text) {
        throw new AppError('Empty response from AI service', 502);
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new AppError('Invalid JSON response from AI service', 502);
      }

      if (!parsed.description || typeof parsed.description !== 'string') {
        throw new AppError('AI response missing description', 502);
      }

      return {
        description: parsed.description.trim().slice(0, 300),
        tags: parseTags(parsed.tags),
      };
    } catch (err) {
      lastError = err;
      if (err instanceof AppError) throw err;
      if (err.status === 401 || err.status === 403) {
        throw new AppError('Invalid OpenAI API key', 503);
      }
      if (err.status === 429 || (err.status >= 500 && attempt < MAX_RETRIES)) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      throw new AppError('AI service unavailable', 503);
    }
  }

  throw lastError;
}

module.exports = { generateDescriptionAndTags };
