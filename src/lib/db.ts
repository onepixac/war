import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false,
});

export default pool;

// Initialize database tables
export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    await client.query(`
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

    await client.query(`
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
        embedding vector(384),
        metadata JSONB DEFAULT '{}'
      )
    `);

    await client.query(`
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS bias_analyses (
        id SERIAL PRIMARY KEY,
        event_topic TEXT NOT NULL,
        article_ids INTEGER[],
        analysis JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
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

    // Index for vector similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS articles_embedding_idx
      ON articles USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `).catch(() => {
      // IVFFlat needs enough rows; fallback to no index initially
    });

    console.log("Database initialized successfully");
  } finally {
    client.release();
  }
}
