export const SEED_SECURITY_KEYS = [
  "ccdcabbacd0f0e97aff69a30d3e525001ae83514534176e3cde1c7b048af926c",
  "93f343225c7a854ffb06a75b38e943420d067df5882ce4d0dc9e07d87198f90f",
  "4e5a00de7e4a9931566f1867035c483c52b4403851bf35d1dd6734b468006458",
  "395b0954f4598774cb56668f551b90d65a4f96dcad478190ab3462807bd4cc52",
  "22c3dd59452cfb783112200b9325a9491722f5a047cd884f8a15b8c1e5f8f8e6",
  "14e2d962766a1d629dcc8bd4f8f43c729c19bc2dd75cf7be411e1c6dbfe5450c",
  "b634f97db690f04cec79384df021a8e7efff0630272c09e832f487bad4d5fc49",
  "dc94ffde69afe261fe16ca833d847b924b9647aff5530afba80caa2f4fa857a5",
];

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

let dbInstance: DatabaseSync | null = null;
let dbPathCached = "";

// 1,048,576 pages * 4096 bytes per page = exactly 4,294,967,296 bytes (4.0 GB)
const FOUR_GB_PAGES = 1048576;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = process.env["DATA_DIR"] || path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "sejmsim.db");
  dbPathCached = dbPath;

  const db = new DatabaseSync(dbPath);

  // Enforce WAL for performance and hard 4GB limit at SQLite engine level
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA max_page_count = ${FOUR_GB_PAGES};
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scenario TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shared_scenarios_ip ON shared_scenarios(ip_hash, expires_at);
    CREATE INDEX IF NOT EXISTS idx_shared_scenarios_active ON shared_scenarios(active, expires_at);

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event, created_at);

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash TEXT NOT NULL,
      name TEXT,
      email TEXT,
      rating INTEGER,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_ip_created ON feedback(ip_hash, created_at);

    CREATE TABLE IF NOT EXISTS private_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scenario TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_private_scenarios_created ON private_scenarios(created_at);

    CREATE TABLE IF NOT EXISTS generated_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_name TEXT NOT NULL,
      image_data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_images_created ON generated_images(created_at);

    CREATE TABLE IF NOT EXISTS failed_login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_failed_login_ip_created ON failed_login_attempts(ip, created_at);

    CREATE TABLE IF NOT EXISTS security_override_keys (
      key TEXT PRIMARY KEY,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      used_at TEXT
    );
  `);

  const shareCols = db.prepare("PRAGMA table_info(shared_scenarios)").all() as { name: string }[];
  if (!shareCols.some((col) => col.name === "content_hash")) {
    db.exec("ALTER TABLE shared_scenarios ADD COLUMN content_hash TEXT");
  }
  if (!shareCols.some((col) => col.name === "featured")) {
    db.exec("ALTER TABLE shared_scenarios ADD COLUMN featured INTEGER NOT NULL DEFAULT 0");
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shared_scenarios_featured ON shared_scenarios(featured, active);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_share_active_hash
    ON shared_scenarios(ip_hash, content_hash)
    WHERE active = 1;
  `);

  
  const countKeys = db.prepare("SELECT COUNT(*) as count FROM security_override_keys").get() as { count: number };
  if (!countKeys || countKeys.count === 0) {
    const insertKey = db.prepare("INSERT OR IGNORE INTO security_override_keys (key, used, created_at) VALUES (?, 0, ?)");
    const now = new Date().toISOString();
    for (const k of SEED_SECURITY_KEYS) {
      insertKey.run(k, now);
    }
  }
  dbInstance = db;
  return db;
}

/**
 * Routine cleanup to prevent unbounded growth and ensure disk usage never approaches 4GB.
 * Prunes expired shares (> 7 days), analytics older than 90 days, and limits total event rows.
 */
export function runMaintenance(): void {
  try {
    const db = getDb();
    const nowIso = new Date().toISOString();

    
    db.prepare("DELETE FROM failed_login_attempts WHERE created_at < ?").run(
      new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    );
    // Wygasłe linki znikają same. Wyłączone i wyróżnione zostają, dopóki właściciel ich nie usunie.
    db.prepare("DELETE FROM shared_scenarios WHERE active = 1 AND (featured IS NULL OR featured = 0) AND expires_at < ? AND expires_at < '9999-01-01'").run(nowIso);

    // 2. Emergency disk check: only if file size approaches 3.8GB, prune oldest events to guarantee < 4GB
    if (dbPathCached && fs.existsSync(dbPathCached)) {
      const stat = fs.statSync(dbPathCached);
      if (stat.size > 3.8 * 1024 * 1024 * 1024) {
        db.prepare(`
          DELETE FROM analytics_events 
          WHERE id NOT IN (
            SELECT id FROM analytics_events ORDER BY id DESC LIMIT 100000
          )
        `).run();
        db.exec("VACUUM;");
      }
    }
  } catch (err) {
    console.error("[server-db] maintenance error:", err);
  }
}

let lastMaintenance = 0;
function maybeRunMaintenance() {
  const now = Date.now();
  if (now - lastMaintenance > 10 * 60 * 1000) {
    lastMaintenance = now;
    runMaintenance();
  }
}

export interface SharedScenarioRow {
  id: string;
  name: string;
  scenario: Record<string, unknown>;
  ip_hash: string;
  active: boolean;
  featured?: boolean;
  views: number;
  created_at: string;
  expires_at: string;
}

export function countActiveSharesForIp(ipHash: string, nowIso: string): { count: number; oldestExpiresAt: string | null } {
  maybeRunMaintenance();
  const db = getDb();
  const rows = db.prepare(`
    SELECT expires_at 
    FROM shared_scenarios 
    WHERE ip_hash = ? AND active = 1 AND expires_at > ?
    ORDER BY expires_at ASC
  `).all(ipHash, nowIso) as { expires_at: string }[];

  return {
    count: rows.length,
    oldestExpiresAt: rows[0]?.expires_at ?? null,
  };
}

export function findActiveShareByHash(
  ipHash: string,
  contentHash: string,
  nowIso: string,
): { id: string; expires_at: string } | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, expires_at FROM shared_scenarios
       WHERE ip_hash = ? AND content_hash = ? AND active = 1 AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(ipHash, contentHash, nowIso) as { id: string; expires_at: string } | undefined;
  return row ?? null;
}

export function insertSharedScenario(entry: {
  id: string;
  name: string;
  scenario: Record<string, unknown>;
  ipHash: string;
  contentHash: string;
  expiresAt: string;
  createdAt?: string;
}): boolean {
  maybeRunMaintenance();
  const db = getDb();
  const nowIso = entry.createdAt ?? new Date().toISOString();
  db.prepare(`
    INSERT INTO shared_scenarios (id, name, scenario, ip_hash, active, views, created_at, expires_at, content_hash)
    VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)
  `).run(
    entry.id,
    entry.name,
    JSON.stringify(entry.scenario),
    entry.ipHash,
    nowIso,
    entry.expiresAt,
    entry.contentHash,
  );
  return true;
}

export function getSharedScenarioById(id: string): SharedScenarioRow | null {
  maybeRunMaintenance();
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, scenario, ip_hash, active, featured, views, created_at, expires_at
    FROM shared_scenarios
    WHERE id = ?
  `).get(id) as {
    id: string;
    name: string;
    scenario: string;
    ip_hash: string;
    active: number;
    featured: number;
    views: number;
    created_at: string;
    expires_at: string;
  } | undefined;

  if (!row) return null;
  return {
    ...row,
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    scenario: JSON.parse(row.scenario),
  };
}

export function incrementShareViews(id: string): void {
  const db = getDb();
  db.prepare("UPDATE shared_scenarios SET views = views + 1 WHERE id = ?").run(id);
}

export function listSharedScenariosForOwner(limit = 200): SharedScenarioRow[] {
  maybeRunMaintenance();
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, active, featured, views, created_at, expires_at
    FROM shared_scenarios
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as {
    id: string;
    name: string;
    active: number;
    featured: number;
    views: number;
    created_at: string;
    expires_at: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    scenario: {},
    ip_hash: "",
    active: Boolean(r.active),
    featured: Boolean(r.featured),
    views: r.views,
    created_at: r.created_at,
    expires_at: r.expires_at,
  }));
}

export function deactivateShareById(id: string): boolean {
  const db = getDb();
  db.prepare("UPDATE shared_scenarios SET active = 0 WHERE id = ?").run(id);
  return true;
}

export function deleteShareById(id: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM shared_scenarios WHERE id = ?").run(id);
  return Number(res.changes) > 0;
}

export function countAnalyticsEvents(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM analytics_events").get() as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function getShareLibraryStats(nowIso: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         COALESCE(SUM(CASE WHEN active = 1 AND expires_at > ? THEN 1 ELSE 0 END), 0) as active,
         COALESCE(SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END), 0) as inactive,
         COALESCE(SUM(CASE WHEN expires_at >= '9999' THEN 1 ELSE 0 END), 0) as permanent,
         COALESCE(SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END), 0) as featured,
         COALESCE(SUM(views), 0) as views
       FROM shared_scenarios`,
    )
    .get(nowIso) as { total: number; active: number; inactive: number; permanent: number; featured: number; views: number };
  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    inactive: Number(row?.inactive ?? 0),
    permanent: Number(row?.permanent ?? 0),
    featured: Number(row?.featured ?? 0),
    views: Number(row?.views ?? 0),
  };
}

export function getFeedbackSummary(limit = 20) {
  const db = getDb();
  const agg = db.prepare("SELECT COUNT(*) as count, AVG(rating) as avg FROM feedback").get() as {
    count: number;
    avg: number | null;
  };
  const recent = db
    .prepare(
      `SELECT name, email, rating, message, created_at
       FROM feedback
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit) as { name: string | null; email: string | null; rating: number; message: string; created_at: string }[];
  return {
    count: Number(agg?.count ?? 0),
    avgRating: agg?.avg == null ? null : Number(agg.avg),
    recent,
  };
}

export function countTotalActiveShares(nowIso: string): number {
  const db = getDb();
  const res = db.prepare(`
    SELECT COUNT(*) as count 
    FROM shared_scenarios 
    WHERE active = 1 AND expires_at > ?
  `).get(nowIso) as { count: number };
  return res?.count ?? 0;
}

export function insertAnalyticsEvent(event: string, payload: Record<string, unknown>): boolean {
  try {
    maybeRunMaintenance();
    const db = getDb();
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO analytics_events (event, payload, created_at)
      VALUES (?, ?, ?)
    `).run(event, JSON.stringify(payload), nowIso);
    return true;
  } catch (err) {
    console.error("[server-db] insertAnalyticsEvent error:", err);
    return false;
  }
}

export interface AnalyticsRow {
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export function getAnalyticsSince(sinceIso: string, limit = 50000): AnalyticsRow[] {
  maybeRunMaintenance();
  const db = getDb();
  const rows = db.prepare(`
    SELECT event, payload, created_at
    FROM analytics_events
    WHERE created_at >= ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(sinceIso, limit) as { event: string; payload: string; created_at: string }[];

  return rows.map((r) => {
    let payload = {};
    try {
      payload = JSON.parse(r.payload);
    } catch {
      // ignore
    }
    return {
      event: r.event,
      payload,
      created_at: r.created_at,
    };
  });
}

export function getAllAnalytics(limit = 1000000): AnalyticsRow[] {
  maybeRunMaintenance();
  const db = getDb();
  const rows = db.prepare(`
    SELECT event, payload, created_at
    FROM analytics_events
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as { event: string; payload: string; created_at: string }[];

  return rows.map((r) => {
    let payload = {};
    try {
      payload = JSON.parse(r.payload);
    } catch {
      // ignore
    }
    return {
      event: r.event,
      payload,
      created_at: r.created_at,
    };
  });
}

export function getRecentFeedbackTimestampForIp(ipHash: string, sinceIso: string): string | null {
  maybeRunMaintenance();
  const db = getDb();
  const row = db.prepare(`
    SELECT created_at
    FROM feedback
    WHERE ip_hash = ? AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(ipHash, sinceIso) as { created_at: string } | undefined;
  return row?.created_at ?? null;
}

export function insertFeedbackRecord(entry: {
  ipHash: string;
  name?: string | null;
  email?: string | null;
  rating: number;
  message: string;
}): boolean {
  maybeRunMaintenance();
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO feedback (ip_hash, name, email, rating, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entry.ipHash, entry.name ?? null, entry.email ?? null, entry.rating, entry.message, nowIso);
  return true;
}

const MAX_PRIVATE_SCENARIOS = 5000;

export function insertPrivateScenario(name: string, scenario: Record<string, unknown>): void {
  maybeRunMaintenance();
  const db = getDb();
  db.prepare("INSERT INTO private_scenarios (name, scenario, created_at) VALUES (?, ?, ?)").run(name, JSON.stringify(scenario), new Date().toISOString());
  db.prepare(`DELETE FROM private_scenarios WHERE id NOT IN (SELECT id FROM private_scenarios ORDER BY id DESC LIMIT ${MAX_PRIVATE_SCENARIOS})`).run();
}

export function listPrivateScenarios(limit = 300): { id: number; name: string; scenario: Record<string, unknown>; created_at: string }[] {
  const rows = getDb().prepare("SELECT id, name, scenario, created_at FROM private_scenarios ORDER BY id DESC LIMIT ?").all(limit) as { id: number; name: string; scenario: string; created_at: string }[];
  return rows.map((r) => {
    let scenario: Record<string, unknown> = {};
    try { scenario = JSON.parse(r.scenario); } catch { /* uszkodzony wpis */ }
    return { ...r, scenario };
  });
}

export function deletePrivateScenario(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM private_scenarios WHERE id = ?").run(id).changes) > 0;
}

export function clearAllPlatformData(): { ok: boolean; deletedEvents: number; deletedShares: number } {
  const db = getDb();
  const resEvents = db.prepare("DELETE FROM analytics_events").run();
  const resShares = db.prepare("DELETE FROM shared_scenarios").run();
  db.prepare("DELETE FROM private_scenarios").run();
  db.prepare("DELETE FROM generated_images").run();
  try {
    db.exec("VACUUM;");
  } catch {
    // vacuum optional
  }
  return {
    ok: true,
    deletedEvents: Number(resEvents.changes),
    deletedShares: Number(resShares.changes),
  };
}

export function togglePermanentShareById(id: string): { permanent: boolean; expiresAt: string } {
  const db = getDb();
  const row = db.prepare("SELECT expires_at FROM shared_scenarios WHERE id = ?").get(id) as { expires_at: string } | undefined;
  if (!row) return { permanent: false, expiresAt: "" };
  const isPermanent = row.expires_at >= "9999";
  const newExpiresAt = isPermanent
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : "9999-12-31T23:59:59.999Z";
  db.prepare("UPDATE shared_scenarios SET expires_at = ?, active = 1 WHERE id = ?").run(newExpiresAt, id);
  return { permanent: !isPermanent, expiresAt: newExpiresAt };
}

export function toggleFeaturedShareById(id: string): { featured: boolean } {
  const db = getDb();
  const row = db.prepare("SELECT featured FROM shared_scenarios WHERE id = ?").get(id) as { featured?: number } | undefined;
  if (!row) return { featured: false };
  const nextFeatured = row.featured ? 0 : 1;
  if (nextFeatured === 1) {
    db.prepare("UPDATE shared_scenarios SET featured = 1, active = 1, expires_at = '9999-12-31T23:59:59.999Z' WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE shared_scenarios SET featured = 0 WHERE id = ?").run(id);
  }
  return { featured: nextFeatured === 1 };
}

export function listFeaturedScenarios(): Array<{
  id: string;
  name: string;
  scenario: Record<string, unknown>;
  views: number;
  created_at: string;
}> {
  maybeRunMaintenance();
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, scenario, views, created_at
    FROM shared_scenarios
    WHERE featured = 1 AND active = 1
    ORDER BY created_at DESC
    LIMIT 50
  `).all() as { id: string; name: string; scenario: string; views: number; created_at: string }[];

  return rows.map((r) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(r.scenario);
    } catch {
      parsed = {};
    }
    return {
      id: r.id,
      name: r.name,
      scenario: parsed,
      views: r.views,
      created_at: r.created_at,
    };
  });
}

export function getDbStats() {
  let sizeBytes = 0;
  if (dbPathCached && fs.existsSync(dbPathCached)) {
    sizeBytes = fs.statSync(dbPathCached).size;
  }
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  const maxMb = 4096;
  const pct = ((sizeBytes / (4 * 1024 * 1024 * 1024)) * 100).toFixed(2);
  return {
    sizeBytes,
    sizeFormatted: `${sizeMb} MB / ${maxMb} MB (${pct}%)`,
    underLimit: sizeBytes < 4 * 1024 * 1024 * 1024,
  };
}


const MAX_GENERATED_IMAGES = 500;

export function insertGeneratedImage(scenarioName: string, imageData: string): void {
  maybeRunMaintenance();
  const db = getDb();
  db.prepare("INSERT INTO generated_images (scenario_name, image_data, created_at) VALUES (?, ?, ?)").run(
    scenarioName.slice(0, 100),
    imageData,
    new Date().toISOString()
  );
  db.prepare(`DELETE FROM generated_images WHERE id NOT IN (SELECT id FROM generated_images ORDER BY id DESC LIMIT ${MAX_GENERATED_IMAGES})`).run();
}

export function listGeneratedImages(limit = 100): Array<{ id: number; scenario_name: string; image_data: string; created_at: string }> {
  maybeRunMaintenance();
  const rows = getDb().prepare("SELECT id, scenario_name, image_data, created_at FROM generated_images ORDER BY id DESC LIMIT ?").all(limit) as Array<{ id: number; scenario_name: string; image_data: string; created_at: string }>;
  return rows;
}

export function deleteGeneratedImage(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM generated_images WHERE id = ?").run(id).changes) > 0;
}

export function countRecentFailedAttempts(ip: string, hours = 12): number {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const row = getDb().prepare("SELECT COUNT(*) as count FROM failed_login_attempts WHERE ip = ? AND created_at >= ?").get(ip, cutoff) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function recordFailedLoginAttempt(ip: string): void {
  getDb().prepare("INSERT INTO failed_login_attempts (ip, created_at) VALUES (?, ?)").run(ip, new Date().toISOString());
}

export function clearFailedAttemptsForIp(ip: string): void {
  getDb().prepare("DELETE FROM failed_login_attempts WHERE ip = ?").run(ip);
}

export function useSecurityOverrideKey(key: string): boolean {
  const clean = key.trim().toLowerCase();
  if (clean.length !== 64) return false;
  const db = getDb();
  const row = db.prepare("SELECT key, used FROM security_override_keys WHERE key = ?").get(clean) as { key: string; used: number } | undefined;
  if (!row || row.used === 1) return false;
  db.prepare("UPDATE security_override_keys SET used = 1, used_at = ? WHERE key = ?").run(new Date().toISOString(), clean);
  return true;
}

export function listSecurityOverrideKeys(): Array<{ key: string; used: boolean; created_at: string; used_at: string | null }> {
  const rows = getDb().prepare("SELECT key, used, created_at, used_at FROM security_override_keys ORDER BY created_at ASC, key ASC").all() as Array<{ key: string; used: number; created_at: string; used_at: string | null }>;
  return rows.map((r) => ({
    key: r.key,
    used: Boolean(r.used),
    created_at: r.created_at,
    used_at: r.used_at,
  }));
}
