import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EVENTS } from "./analytics-events";

const trackSchema = z.object({
  event: z.enum(EVENTS),
  meta: z.string().max(100).optional(),
  shares: z.record(z.string(), z.number().min(0).max(100)).optional(),
  turnout: z.number().min(0).max(100).optional(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => trackSchema.parse(data))
  .handler(async ({ data }) => {
    const { insertAnalyticsEvent } = await import("./server-db.server");
    try {
      insertAnalyticsEvent(data.event, {
        shares: data.shares ?? null,
        turnout: data.turnout ?? null,
        meta: data.meta ?? null,
      });
      return { ok: true };
    } catch (err) {
      console.error("analytics insert error", err);
      return { ok: false };
    }
  });

const summarySchema = z.object({ login: z.string().max(50), key: z.string().min(1).max(200) });

function getPolishHour(isoString: string): number {
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Warsaw",
      hour: "numeric",
      hourCycle: "h23",
    });
    return parseInt(formatter.format(d), 10) % 24;
  } catch {
    return new Date(isoString).getUTCHours();
  }
}

function getPolishDay(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return isoString.slice(0, 10);
  }
}

export const getAnalyticsSummary = createServerFn({ method: "POST" })
  .inputValidator((data) => summarySchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) {
      return { ok: false as const, error: "Nieprawidłowy login lub hasło." };
    }

    const { getAllAnalytics, countTotalActiveShares, getDbStats } = await import("./server-db.server");
    const rows = getAllAnalytics(500000);

    const countBy = (name: string) => rows.filter((r) => r.event === name).length;

    const turnoutValues = rows
      .filter((r) => r.event === "turnout_set" && typeof (r.payload as { turnout?: number })?.turnout === "number")
      .map((r) => (r.payload as { turnout: number }).turnout);
    const avgTurnout = turnoutValues.length
      ? turnoutValues.reduce((a, b) => a + b, 0) / turnoutValues.length
      : null;

    const shareSums = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      if (!["scenario_save", "scenario_download", "share_link_create"].includes(r.event)) continue;
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
    for (const r of rows) {
      if (r.event !== "page_view") continue;
      const day = getPolishDay(r.created_at);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const visitsByDay = [...byDay.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.day.localeCompare(a.day));

    // Pogrupowanie według miesięcy (YYYY-MM)
    const monthMap = new Map<string, { month: string; label: string; count: number; days: { day: string; count: number }[] }>();
    for (const { day, count } of visitsByDay) {
      const ym = day.slice(0, 7);
      if (!monthMap.has(ym)) {
        let label = ym;
        try {
          const [y, m] = ym.split("-").map(Number);
          const d = new Date(Date.UTC(y, m - 1, 15));
          const monthName = new Intl.DateTimeFormat("pl-PL", { month: "long" }).format(d);
          label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
        } catch {
          label = ym;
        }
        monthMap.set(ym, { month: ym, label, count: 0, days: [] });
      }
      const mObj = monthMap.get(ym)!;
      mObj.count += count;
      mObj.days.push({ day, count });
    }
    const visitsByMonth = [...monthMap.values()].sort((a, b) => b.month.localeCompare(a.month));

    const eventCounts = new Map<string, number>();
    const metaCounts = new Map<string, number>();
    const hours = Array.from({ length: 24 }, () => 0);
    const hoursPolish = Array.from({ length: 24 }, () => 0);

    // New enriched insights
    const districtViews = new Map<string, number>();
    const coalitionTests = new Map<string, { count: number; majority: boolean }>();
    const partyAdjustments = new Map<string, number>();
    const mapModeCounts = new Map<string, number>();
    const historyYearCounts = new Map<string, number>();
    const turnoutGroupCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    const trafficSources = new Map<string, number>();

    for (const r of rows) {
      eventCounts.set(r.event, (eventCounts.get(r.event) ?? 0) + 1);
      const meta = (r.payload as { meta?: string | null })?.meta;
      if (meta) {
        const k = `${r.event}:${meta}`;
        metaCounts.set(k, (metaCounts.get(k) ?? 0) + 1);
      }

      if (r.event === "page_view") {
        hours[new Date(r.created_at).getUTCHours()]! += 1;
        hoursPolish[getPolishHour(r.created_at)]! += 1;
        if (meta) {
          const parts = meta.split("|");
          const dev = parts[0] || "nieznane";
          const src = parts[1] || "bezpośrednie";
          deviceCounts.set(dev, (deviceCounts.get(dev) ?? 0) + 1);
          trafficSources.set(src, (trafficSources.get(src) ?? 0) + 1);
        }
      } else if (r.event === "district_view" && meta) {
        districtViews.set(meta, (districtViews.get(meta) ?? 0) + 1);
      } else if (r.event === "coalition_test" && meta) {
        const [coalitionName, maj] = meta.split(":");
        const entry = coalitionTests.get(coalitionName) ?? { count: 0, majority: maj === "tak" || maj === "wiekszosc" };
        entry.count += 1;
        entry.majority = maj === "tak" || maj === "wiekszosc";
        coalitionTests.set(coalitionName, entry);
      } else if (r.event === "party_slider_adjust" && meta) {
        partyAdjustments.set(meta, (partyAdjustments.get(meta) ?? 0) + 1);
      } else if (r.event === "map_mode_change" && meta) {
        mapModeCounts.set(meta, (mapModeCounts.get(meta) ?? 0) + 1);
      } else if (r.event === "historical_view" && meta) {
        historyYearCounts.set(meta, (historyYearCounts.get(meta) ?? 0) + 1);
      } else if (r.event === "turnout_group_move" && meta) {
        turnoutGroupCounts.set(meta, (turnoutGroupCounts.get(meta) ?? 0) + 1);
      }
    }

    const turnoutBuckets = new Map<string, number>();
    for (const t of turnoutValues) {
      const b = `${Math.floor(t / 5) * 5}-${Math.floor(t / 5) * 5 + 5}%`;
      turnoutBuckets.set(b, (turnoutBuckets.get(b) ?? 0) + 1);
    }

    const nowIso = new Date().toISOString();
    const activeShares = countTotalActiveShares(nowIso);
    const dbStats = getDbStats();

    return {
      ok: true as const,
      eventCounts: [...eventCounts.entries()].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count),
      metaCounts: [...metaCounts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 60),
      pageViewsByHourUtc: hours,
      pageViewsByHourPolish: hoursPolish,
      turnoutBuckets: [...turnoutBuckets.entries()].map(([bucket, count]) => ({ bucket, count })).sort((a, b) => a.bucket.localeCompare(b.bucket, undefined, { numeric: true })),
      activeShares,
      totalEvents: rows.length,
      pageViews: countBy("page_view"),
      supportClicks: countBy("support_click"),
      contactClicks: countBy("contact_click"),
      aboutViews: countBy("about_view"),
      scenarioSaves: countBy("scenario_save"),
      scenarioDownloads: countBy("scenario_download"),
      scenarioShares: countBy("scenario_share"),
      turnoutSets: countBy("turnout_set"),
      avgTurnout,
      avgShares,
      visitsByDay,
      visitsByMonth,
      // Enriched options
      topDistricts: [...districtViews.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      topCoalitions: [...coalitionTests.entries()].map(([members, data]) => ({ members, count: data.count, majority: data.majority })).sort((a, b) => b.count - a.count).slice(0, 10),
      partyAdjustments: [...partyAdjustments.entries()].map(([party, count]) => ({ party, count })).sort((a, b) => b.count - a.count),
      mapModes: [...mapModeCounts.entries()].map(([mode, count]) => ({ mode, count })).sort((a, b) => b.count - a.count),
      historicalViews: [...historyYearCounts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.count - a.count),
      turnoutGroupMoves: [...turnoutGroupCounts.entries()].map(([move, count]) => ({ move, count })).sort((a, b) => b.count - a.count),
      deviceBreakdown: [...deviceCounts.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count),
      trafficSources: [...trafficSources.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      dbStats,
    };
  });

const clearDataSchema = z.object({
  login: z.string().max(50),
  key: z.string().min(1).max(200),
  confirmPassword: z.string().min(1).max(200),
});

export const clearAllAnalyticsData = createServerFn({ method: "POST" })
  .inputValidator((data) => clearDataSchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key) || !isOwner(data.login, data.confirmPassword)) {
      return { ok: false as const, error: "Nieprawidłowe hasło potwierdzające." };
    }
    const { clearAllPlatformData } = await import("./server-db.server");
    const result = clearAllPlatformData();
    return { ok: true as const, result };
  });

