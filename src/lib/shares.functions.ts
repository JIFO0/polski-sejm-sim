import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const MAX_ACTIVE_PER_IP = 5;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  scenario: z
    .record(z.string(), z.unknown())
    .refine((s) => s["version"] === 1 && typeof s["districts"] === "object" && typeof s["parties"] === "object", "zły format")
    .refine((s) => JSON.stringify(s).length < 200_000, "za duży"),
});

function randomId() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function scenarioFingerprint(scenario: Record<string, unknown>) {
  const copy = { ...scenario };
  delete copy["createdAt"];
  return stableStringify(copy);
}

export const createShare = createServerFn({ method: "POST" })
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { sha256 } = await import("./owner-auth.server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`sejmometr:${ip}`);
    const { countActiveSharesForIp, findActiveShareByHash, insertSharedScenario } = await import("./server-db.server");
    const now = new Date().toISOString();
    const contentHash = await sha256(scenarioFingerprint(data.scenario));
    const existing = findActiveShareByHash(ipHash, contentHash, now);
    if (existing) {
      return { ok: true as const, id: existing.id, expiresAt: existing.expires_at, reused: true as const };
    }

    const activeInfo = countActiveSharesForIp(ipHash, now);
    if (activeInfo.count >= MAX_ACTIVE_PER_IP) {
      return {
        ok: false as const,
        error: `Możesz mieć najwyżej ${MAX_ACTIVE_PER_IP} aktywnych linków naraz.`,
        nextAt: activeInfo.oldestExpiresAt,
      };
    }

    const id = randomId();
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    try {
      insertSharedScenario({
        id,
        name: data.name,
        scenario: data.scenario as Record<string, unknown>,
        ipHash,
        contentHash,
        expiresAt,
      });
      return { ok: true as const, id, expiresAt, reused: false as const };
    } catch (err) {
      const again = findActiveShareByHash(ipHash, contentHash, now);
      if (again) {
        return { ok: true as const, id: again.id, expiresAt: again.expires_at, reused: true as const };
      }
      console.error("share insert error", err);
      return { ok: false as const, error: "Nie udało się utworzyć linku." };
    }
  });

export const getShare = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().regex(/^[a-z0-9]{6,20}$/) }).parse(data))
  .handler(async ({ data }) => {
    const { getSharedScenarioById, incrementShareViews } = await import("./server-db.server");
    const row = getSharedScenarioById(data.id);
    if (!row || !row.active || new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "Ten link wygasł lub został wyłączony." };
    }
    incrementShareViews(data.id);
    return { ok: true as const, name: row.name, scenarioJson: JSON.stringify(row.scenario), expiresAt: row.expires_at };
  });

const ownerSchema = z.object({ login: z.string().max(50), key: z.string().min(1).max(200) });

export const listShares = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { listSharedScenariosForOwner } = await import("./server-db.server");
    try {
      const rows = listSharedScenariosForOwner(1000);
      return { ok: true as const, shares: rows.map(({ scenario: _s, ip_hash: _h, ...rest }) => rest) };
    } catch (err) {
      console.error("list shares error", err);
      return { ok: false as const, error: "Nie udało się odczytać linków." };
    }
  });

export const deactivateShare = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.string().max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { deactivateShareById } = await import("./server-db.server");
    try {
      deactivateShareById(data.id);
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const deleteShare = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.string().max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { deleteShareById } = await import("./server-db.server");
    try {
      const removed = deleteShareById(data.id);
      return removed ? { ok: true as const } : { ok: false as const, error: "Nie znaleziono linku." };
    } catch {
      return { ok: false as const, error: "Nie udało się usunąć linku." };
    }
  });

export const togglePermanentShare = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.string().max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { togglePermanentShareById } = await import("./server-db.server");
    try {
      const result = togglePermanentShareById(data.id);
      return { ok: true as const, permanent: result.permanent, expiresAt: result.expiresAt };
    } catch {
      return { ok: false as const };
    }
  });

export const toggleFeaturedShare = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.string().max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { toggleFeaturedShareById } = await import("./server-db.server");
    try {
      const result = toggleFeaturedShareById(data.id);
      return { ok: true as const, featured: result.featured };
    } catch {
      return { ok: false as const };
    }
  });

export const getFeaturedScenarios = createServerFn({ method: "GET" }).handler(async () => {
  const { listFeaturedScenarios } = await import("./server-db.server");
  try {
    const items = listFeaturedScenarios().map(({ scenario, ...item }) => ({ ...item, scenarioJson: JSON.stringify(scenario) }));
    return { ok: true as const, items };
  } catch (err) {
    console.error("getFeaturedScenarios error:", err);
    return { ok: false as const, items: [] };
  }
});

