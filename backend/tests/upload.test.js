const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const db = require('../db/knex');
const { closeDb } = require('../db/database');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/auto_shorts_saas_test';
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await db('uploads').del();
  await db('users').del();
});

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

describe('GET /api/history', () => {
  it('returns empty list initially', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('supports pagination parameters', async () => {
    const res = await request(app).get('/api/history?limit=10&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
    expect(res.body.offset).toBe(0);
  });

  it('clamps limit to max 100', async () => {
    const res = await request(app).get('/api/history?limit=999');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });
});

describe('GET /api/history/:id', () => {
  it('returns 404 for non-existent upload', async () => {
    const res = await request(app).get('/api/history/99999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/history/abc');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/upload', () => {
  const testVideo = path.join(__dirname, 'fixtures', 'test.mp4');

  beforeAll(() => {
    const fixtureDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    if (!fs.existsSync(testVideo)) {
      const minimalMp4 = Buffer.from([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6F, 0x6D,
      ]);
      fs.writeFileSync(testVideo, minimalMp4);
    }
  });

  it('rejects request without file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('title', 'Test Title');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/video file/i);
  });

  it('rejects request without title', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('video', testVideo);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('rejects empty title', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('title', '')
      .attach('video', testVideo);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('rejects file with invalid magic bytes', async () => {
    const fakeFile = path.join(__dirname, 'fixtures', 'fake.txt');
    fs.writeFileSync(fakeFile, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    const res = await request(app)
      .post('/api/upload')
      .field('title', 'Test Title')
      .attach('video', fakeFile, { contentType: 'video/mp4' });
    fs.unlinkSync(fakeFile);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content.*not match/i);
  });

  it('rejects oversized file', async () => {
    const largeFile = path.join(__dirname, 'fixtures', 'large.txt');
    const buf = Buffer.alloc(51 * 1024 * 1024 + 1);
    fs.writeFileSync(largeFile, buf);
    const res = await request(app)
      .post('/api/upload')
      .field('title', 'Test Title')
      .attach('video', largeFile, { contentType: 'video/mp4' });
    fs.unlinkSync(largeFile);
    expect(res.status).toBe(413);
  }, 15000);
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
