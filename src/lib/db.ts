import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./.data/tracker.db";
const databasePath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
const absolutePath = resolve(/* turbopackIgnore: true */ process.cwd(), databasePath);
mkdirSync(dirname(absolutePath), { recursive: true });

const globalForDatabase = globalThis as unknown as { trackerDb?: Database.Database };
const MIGRATIONS = [
  "202609140001_init",
  "202609140002_check_comparisons",
  "202609140003_remove_seed_content_rules",
  "202609140004_live_status",
  "202609140005_live_marker_evidence",
  "202609170001_track_previous_endpoints",
  "202609170002_split_monthly_events",
] as const;

function initialize(database: Database.Database) {
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec("CREATE TABLE IF NOT EXISTS _Migration (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)");
  for (const name of MIGRATIONS) {
    const applied = database.prepare("SELECT name FROM _Migration WHERE name = ?").get(name);
    if (applied) continue;
    const migrationPath = resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`);
    if (!existsSync(migrationPath)) throw new Error(`DB 마이그레이션 파일이 없습니다: ${migrationPath}`);
    const apply = database.transaction(() => {
      database.exec(readFileSync(migrationPath, "utf8"));
      database.prepare("INSERT INTO _Migration (name, appliedAt) VALUES (?, ?)").run(name, new Date().toISOString());
    });
    apply();
  }
}

export const db = globalForDatabase.trackerDb ?? new Database(absolutePath);
initialize(db);

if (process.env.NODE_ENV !== "production") globalForDatabase.trackerDb = db;

export function createId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function closeDb() {
  if (db.open) db.close();
}
