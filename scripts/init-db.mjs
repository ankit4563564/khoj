import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local if present
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not defined.');
  console.error('Please configure DATABASE_URL in .env.local or your deployment environment.');
  process.exit(1);
}

const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Error: Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const client = new pg.Client({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

async function main() {
  console.log('🔄 Connecting to PostgreSQL database...');
  await client.connect();
  console.log('✅ Connected successfully.');

  console.log('🔄 Executing schema initialization (CREATE TABLE IF NOT EXISTS)...');
  await client.query(schemaSql);
  console.log('✅ All KHOJ tables and indexes are ready.');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Schema initialization failed:', err);
  process.exit(1);
});
