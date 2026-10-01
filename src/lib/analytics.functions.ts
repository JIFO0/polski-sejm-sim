import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const trackSchema = z.object({
  event: z.enum(["page_view", "turnout_set", "scenario_save", "scenario_download", "scenario_share"]),
  shares: z.record(z.string(), z.number().min(0).max(100)).optional(),
  turnout: z.number().min(0).max(100).optional(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => trackSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event: data.event,
      payload: { shares: data.shares ?? null, turnout: data.turnout ?? null },
    });
    if (error) console.error("analytics insert", error);
    return { ok: !error };
  });

const summarySchema = z.object({ key: z.string().min(1).max(200) });

export const getAnalyticsSummary = createServerFn({ method: "POST" })
  .inputValidator((data) => summarySchema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env["ANALYTICS_KEY"];
    if (!expected || data.key !== expected) {
      return { ok: false as const, error: "Nieprawidłowy klucz dostępu." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("event, payload, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) {
      console.error("analytics read", error);
      return { ok: false as const, error: "Nie udało się odczytać statystyk." };
    }

    const events = rows ?? [];
    const countBy = (name: string) => events.filter((r) => r.event === name).length;

    const turnoutValues = events
      .filter((r) => r.event === "turnout_set" && typeof (r.payload as { turnout?: number })?.turnout === "number")
      .map((r) => (r.payload as { turnout: number }).turnout);
    const avgTurnout = turnoutValues.length
      ? turnoutValues.reduce((a, b) => a + b, 0) / turnoutValues.length
      : null;

    const shareSums = new Map<string, { sum: number; n: number }>();
    for (const r of events) {
      if (r.event !== "scenario_save" && r.event !== "scenario_download") continue;
      const shares = (r.payload as { shares?: Record<string, number> })?.shares;
      if (!shares) continue;
      for (const [party, value] of Object.entries(shares)) {
        const acc = shareSums.get(party) ?? { sum: 0, n: 0 };
        acc.sum += value;
        acc.n += 1;
        shareSums.set(party, acc);
      }
    }
    const avgShares = [...shareSums.entries()]
      .map(([party, { sum, n }]) => ({ party, avg: sum / n, count: n }))
      .sort((a, b) => b.avg - a.avg);

    const byDay = new Map<string, number>();
    for (const r of events) {
      if (r.event !== "page_view") continue;
      const day = r.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const visitsByDay = [...byDay.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => b.day.localeCompare(a.day));

    return {
      ok: true as const,
      totalEvents: events.length,
      pageViews: countBy("page_view"),
      scenarioSaves: countBy("scenario_save"),
      scenarioDownloads: countBy("scenario_download"),
      scenarioShares: countBy("scenario_share"),
      turnoutSets: countBy("turnout_set"),
      avgTurnout,
      avgShares,
      visitsByDay,
    };
  });
