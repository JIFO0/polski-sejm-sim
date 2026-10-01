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

export const createShare = createServerFn({ method: "POST" })
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const { sha256 } = await import("./owner-auth.server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`sejmometr:${ip}`);
    const { countActiveSharesForIp, insertSharedScenario } = await import("./server-db.server");
    const now = new Date().toISOString();

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
        expiresAt,
      });
      return { ok: true as const, id, expiresAt };
    } catch (err) {
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
      const rows = listSharedScenariosForOwner(200);
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
