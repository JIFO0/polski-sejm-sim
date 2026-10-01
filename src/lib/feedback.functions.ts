import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Niepoprawny format adresu e-mail.",
    }),
  rating: z.number().int().min(1).max(10),
  message: z.string().trim().min(3, "Opinia jest za krótka.").max(1500, "Opinia może mieć maksymalnie 1500 znaków."),
});

const WINDOW_MS = 12 * 60 * 60 * 1000;

export const sendFeedback = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const webhook = process.env["DISCORD_FEEDBACK_WEBHOOK_URL"]?.trim();

    const { sha256 } = await import("./owner-auth.server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      getRequestHeader("x-real-ip") ??
      "unknown";
    const ipHash = await sha256(`sejmometr:${ip}`);

    const { getRecentFeedbackTimestampForIp, insertFeedbackRecord } = await import("./server-db.server");
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const lastCreatedAt = getRecentFeedbackTimestampForIp(ipHash, since);
    if (lastCreatedAt) {
      const nextAt = new Date(new Date(lastCreatedAt).getTime() + WINDOW_MS);
      return { ok: false as const, error: "Możesz dodać jedną opinię na 12 godzin.", nextAt: nextAt.toISOString() };
    }

    try {
      insertFeedbackRecord({
        ipHash,
        name: data.name?.trim() || null,
        email: data.email?.trim() || null,
        rating: data.rating,
        message: data.message.trim(),
      });
    } catch (err) {
      console.error("feedback insert error", err);
      return { ok: false as const, error: "Nie udało się zapisać opinii." };
    }

    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            username: "SejmSim 2027 (sejmsim.pl)",
            allowed_mentions: { parse: [] },
            embeds: [
              {
                title: "Nowa opinia",
                description: data.message.trim(),
                color: 0xf26722,
                fields: [
                  { name: "Ocena", value: `${data.rating}/10 ⭐`, inline: true },
                  { name: "Podpis", value: data.name?.trim() || "anonim", inline: true },
                  { name: "E-mail", value: data.email?.trim() || "nie podano", inline: false },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(`Discord webhook [${res.status}]: ${errText}`);
        }
      } catch (err) {
        console.error("Discord webhook error", err);
      }
    }

    return { ok: true as const };
  });
