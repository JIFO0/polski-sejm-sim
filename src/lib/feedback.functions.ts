import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(254).optional(),
  rating: z.number().int().min(1).max(10),
  message: z.string().trim().min(3).max(1500),
});

const WINDOW_MS = 12 * 60 * 60 * 1000;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const sendFeedback = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const webhook = process.env["DISCORD_FEEDBACK_WEBHOOK_URL"];
    if (!webhook) return { ok: false as const, error: "Opinie są chwilowo niedostępne." };

    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const ipHash = await sha256(`sejmometr:${ip}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data: recent, error: qErr } = await supabaseAdmin
      .from("feedback")
      .select("created_at")
      .eq("ip_hash", ipHash)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (qErr) {
      console.error("feedback query", qErr);
      return { ok: false as const, error: "Nie udało się wysłać opinii." };
    }
    const last = recent?.[0];
    if (last) {
      const nextAt = new Date(new Date(last.created_at).getTime() + WINDOW_MS);
      return { ok: false as const, error: "Możesz dodać jedną opinię na 12 godzin.", nextAt: nextAt.toISOString() };
    }

    const { error: insErr } = await supabaseAdmin
      .from("feedback")
      .insert({
        ip_hash: ipHash,
        name: data.name || null,
        email: data.email || null,
        rating: data.rating,
        message: data.message,
      });
    if (insErr) {
      console.error("feedback insert", insErr);
      return { ok: false as const, error: "Nie udało się wysłać opinii." };
    }

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "SejmSim 2027 (sejmsim.pl)",
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: "Nowa opinia",
            description: data.message,
            color: 0xf26722,
            fields: [
              { name: "Ocena", value: `${data.rating}/10`, inline: true },
              { name: "Podpis", value: data.name || "anonim", inline: true },
              { name: "E-mail", value: data.email || "nie podano", inline: false },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) console.error(`Discord webhook [${res.status}]: ${await res.text()}`);

    return { ok: true as const };
  });
