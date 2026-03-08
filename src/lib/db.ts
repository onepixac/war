import { Pool } from "@neondatabase/serverless";

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getPool();
  const result = await p.query(text, params);
  return result.rows;
}

// Initialize database tables
export async function initDB() {
  await query("CREATE EXTENSION IF NOT EXISTS vector");

  await query(`
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      region TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      category TEXT DEFAULT 'independent',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      source_id INTEGER REFERENCES sources(id),
      title TEXT NOT NULL,
      original_title TEXT,
      content TEXT,
      summary TEXT,
      url TEXT UNIQUE,
      language TEXT,
      region TEXT,
      published_at TIMESTAMP,
      fetched_at TIMESTAMP DEFAULT NOW(),
      embedding vector(1024),
      metadata JSONB DEFAULT '{}'
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS attacks (
      id SERIAL PRIMARY KEY,
      article_id INTEGER REFERENCES articles(id),
      attack_type TEXT,
      severity TEXT DEFAULT 'LOW',
      location TEXT,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      description TEXT,
      classified_at TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bias_analyses (
      id SERIAL PRIMARY KEY,
      event_topic TEXT NOT NULL,
      article_ids INTEGER[],
      analysis JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS fact_checks (
      id SERIAL PRIMARY KEY,
      claim TEXT NOT NULL,
      article_ids INTEGER[],
      confidence_score DOUBLE PRECISION,
      verdict TEXT,
      evidence JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Ensure embedding column is 1024 dimensions (may have been created as 384)
  await query(`ALTER TABLE articles ALTER COLUMN embedding TYPE vector(1024)`).catch(() => {});

  console.log("Database initialized successfully");
}
