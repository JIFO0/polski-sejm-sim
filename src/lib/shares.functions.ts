import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const MAX_ACTIVE_PER_IP = 3;
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const { data: active, error: qErr } = await supabaseAdmin
      .from("shared_scenarios")
      .select("expires_at")
      .eq("ip_hash", ipHash)
      .eq("active", true)
      .gt("expires_at", now)
      .order("expires_at", { ascending: true });
    if (qErr) {
      console.error("share query", qErr);
      return { ok: false as const, error: "Nie udało się utworzyć linku." };
    }
    if ((active?.length ?? 0) >= MAX_ACTIVE_PER_IP) {
      return {
        ok: false as const,
        error: `Możesz mieć najwyżej ${MAX_ACTIVE_PER_IP} aktywne linki naraz.`,
        nextAt: active?.[0]?.expires_at ?? null,
      };
    }

    const id = randomId();
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    const { error } = await supabaseAdmin.from("shared_scenarios").insert({
      id,
      name: data.name,
      scenario: data.scenario as never,
      ip_hash: ipHash,
      expires_at: expiresAt,
    });
    if (error) {
      console.error("share insert", error);
      return { ok: false as const, error: "Nie udało się utworzyć linku." };
    }
    return { ok: true as const, id, expiresAt };
  });

export const getShare = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().regex(/^[a-z0-9]{6,20}$/) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("shared_scenarios")
      .select("name, scenario, expires_at, active, views")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || !row.active || new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "Ten link wygasł lub został wyłączony." };
    }
    await supabaseAdmin.from("shared_scenarios").update({ views: row.views + 1 }).eq("id", data.id);
    return { ok: true as const, name: row.name, scenario: row.scenario, expiresAt: row.expires_at };
  });

const ownerSchema = z.object({ login: z.string().max(50), key: z.string().min(1).max(200) });

export const listShares = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("shared_scenarios")
      .select("id, name, active, views, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { ok: false as const, error: "Nie udało się odczytać linków." };
    return { ok: true as const, shares: rows ?? [] };
  });

export const deactivateShare = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.string().max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, error: "Brak dostępu." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shared_scenarios").update({ active: false }).eq("id", data.id);
    return { ok: !error };
  });
