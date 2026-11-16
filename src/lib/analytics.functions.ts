import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { EVENTS } from "./analytics-events";

const ipTrackLimits = new Map<string, { count: number; resetAt: number }>();

function isTrackRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipTrackLimits.get(ip) ?? { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  ipTrackLimits.set(ip, entry);
  return entry.count > 120;
}

const trackSchema = z.object({
  event: z.string().max(60),
  meta: z.string().max(200).optional(),
  shares: z.record(z.string(), z.number()).optional(),
  turnout: z.number().optional(),
  partyLabels: z.record(z.string().max(50), z.string().max(80)).optional(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    try {
      return trackSchema.parse(data);
    } catch {
      return { event: "unknown" };
    }
  })
  .handler(async ({ data }) => {
    if (!data?.event || data.event === "unknown") return { ok: false };
    const ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    if (isTrackRateLimited(ip)) return { ok: false };

    // Wykluczenia backendowe: odrzucamy ruch ze statystyk, api i assetów
    const referer = (getRequestHeader("referer") ?? "").toLowerCase();
    if (referer.includes("/statystyki") || referer.includes("/api")) {
      return { ok: false };
    }
    const meta = data.meta ? String(data.meta).slice(0, 200) : null;
    if (meta) {
      if (meta.startsWith("/statystyki") || meta.startsWith("/api")) return { ok: false };
      if (/\.(js|css|png|jpg|jpeg|svg|webp|ico|json|woff2?|map)$/i.test(meta)) return { ok: false };
    }

    try {
      const { insertAnalyticsEvent } = await import("./server-db.server");
      // Zgodnie z punktem 5b: nie zapisujemy preferencji politycznych powiązanych z sesją
      insertAnalyticsEvent(data.event, {
        shares: null,
        turnout: null,
        meta,
        partyLabels: data.partyLabels ?? {},
      });
      return { ok: true };
    } catch (err) {
      console.error("analytics insert error", err);
      return { ok: false };
    }
  });

const summarySchema = z.object({
  login: z.string().max(50),
  key: z.string().min(1).max(200),
  securityKey: z.string().max(100).optional(),
});

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function getPolishWeekdayIndex(isoString: string): number {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", weekday: "short" }).format(new Date(isoString));
    return WEEKDAY_INDEX[name] ?? 0;
  } catch {
    const day = new Date(isoString).getUTCDay();
    return day === 0 ? 6 : day - 1;
  }
}

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
    const { verifyOwnerAccess } = await import("./owner-auth.server");
    const auth = await verifyOwnerAccess(data);
    if (!auth.ok) {
      return { ok: false as const, error: auth.error ?? "Nieprawidłowy login lub hasło." };
    }

    const { getAllAnalytics, countTotalActiveShares, getDbStats, countAnalyticsEvents, getFeedbackSummary, getShareLibraryStats, listSecurityOverrideKeys, listGeneratedImages } =
      await import("./server-db.server");
    const totalEventsInDb = countAnalyticsEvents();
    const rows = getAllAnalytics(Math.max(totalEventsInDb, 1));
    const {
      listPrivateScenarios,
      listSharedScenariosForOwner,
    } = await import("./server-db.server");
    const partyLabels: Record<string, string> = {};
    const collectScenarioLabels = (scenario: Record<string, unknown> | undefined) => {
      if (!scenario) return;
      for (const listKey of ["customParties", "mergers"] as const) {
        const list = scenario[listKey];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          const id = (item as Record<string, unknown>)["id"];
          const name = (item as Record<string, unknown>)["name"];
          if (typeof id === "string" && typeof name === "string" && name.trim()) {
            partyLabels[id] = name.trim();
          }
        }
      }
    };
    for (const priv of listPrivateScenarios(500)) collectScenarioLabels(priv.scenario);
    for (const sh of listSharedScenariosForOwner(500)) collectScenarioLabels(sh.scenario);
    for (const row of [...rows].reverse()) {
      const labels = (row.payload as { partyLabels?: Record<string, string> })?.partyLabels;
      for (const [id, name] of Object.entries(labels ?? {})) {
        if (typeof name === "string" && name.trim()) partyLabels[id] = name;
      }
    }

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

    const isVisitRow = (event: string, meta: string | null | undefined): boolean => {
      if (event === "session_start") return true;
      if (event === "page_view") {
        if (meta && (meta.startsWith("/") || meta.startsWith("http"))) {
          return false;
        }
        return true;
      }
      return false;
    };

    const PATH_NAMES: Record<string, string> = {
      "/": "Kalkulator główny (Strona domowa)",
      "/zrodla": "Źródła i metodologia badań",
      "/korekta-okregow": "Korekta okręgów wyborczych PKW",
      "/metoda-dhondta": "Metoda D'Hondta – przewodnik",
      "/o-projekcie": "O projekcie i autorze",
      "/preview": "Nowy interfejs 2.0 (Preview)",
      "/statystyki": "Panel administratora",
    };

    const byDay = new Map<string, number>();
    let totalSessions = 0;
    let totalPageViews = 0;
    const pagePathCounts = new Map<string, number>();

    const eventCounts = new Map<string, number>();
    const metaCounts = new Map<string, number>();
    const hours = Array.from({ length: 24 }, () => 0);
    const hoursPolish = Array.from({ length: 24 }, () => 0);
    const weekdayVisits = [0, 0, 0, 0, 0, 0, 0];

    const districtViews = new Map<string, number>();
    const coalitionTests = new Map<string, { count: number; majorityHits: number }>();
    const partyAdjustments = new Map<string, number>();
    const mapModeCounts = new Map<string, number>();
    const historyYearCounts = new Map<string, number>();
    const turnoutGroupCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    const trafficSources = new Map<string, number>();

    const utmCampaignCounts = new Map<string, number>();
    const utmSourceCounts = new Map<string, number>();
    const pollInstituteClicks = new Map<string, number>();
    const pollTabChanges = new Map<string, number>();

    for (const r of rows) {
      eventCounts.set(r.event, (eventCounts.get(r.event) ?? 0) + 1);
      const meta = (r.payload as { meta?: string | null })?.meta;
      if (meta) {
        const k = `${r.event}:${meta}`;
        metaCounts.set(k, (metaCounts.get(k) ?? 0) + 1);
      }

      // 1. Zliczanie odsłon stron (pageviews)
      if (r.event === "page_view") {
        totalPageViews += 1;
        let p = "/";
        if (meta && meta.startsWith("/")) {
          p = meta.split("?")[0].replace(/\/+$/, "") || "/";
        }
        pagePathCounts.set(p, (pagePathCounts.get(p) ?? 0) + 1);
      }

      // 2. Zliczanie sesji / wizyt (czas, urządzenie, źródło)
      if (isVisitRow(r.event, meta)) {
        totalSessions += 1;
        const day = getPolishDay(r.created_at);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);

        const utcHour = new Date(r.created_at).getUTCHours();
        const polishHour = getPolishHour(r.created_at);
        const weekday = getPolishWeekdayIndex(r.created_at);
        hours[utcHour] = (hours[utcHour] ?? 0) + 1;
        hoursPolish[polishHour] = (hoursPolish[polishHour] ?? 0) + 1;
        weekdayVisits[weekday] = (weekdayVisits[weekday] ?? 0) + 1;

        if (meta && !meta.startsWith("/")) {
          const parts = meta.split("|");
          const rawDev = (parts[0] || "").trim().toLowerCase();
          const rawSrc = (parts[1] || "bezpośrednie").trim().toLowerCase();

          let dev = "inne / nieznane";
          if (rawDev === "telefon") dev = "telefon";
          else if (rawDev === "tablet") dev = "tablet";
          else if (rawDev === "komputer") dev = "komputer";

          deviceCounts.set(dev, (deviceCounts.get(dev) ?? 0) + 1);
          trafficSources.set(rawSrc || "bezpośrednie", (trafficSources.get(rawSrc || "bezpośrednie") ?? 0) + 1);

          if (meta.includes("|utm:")) {
            const utmPart = meta.split("|utm:")[1] || "";
            const [uSrc, , uCamp] = utmPart.split("|");
            if (uSrc && uSrc !== "-") utmSourceCounts.set(uSrc, (utmSourceCounts.get(uSrc) ?? 0) + 1);
            if (uCamp && uCamp !== "-") utmCampaignCounts.set(uCamp, (utmCampaignCounts.get(uCamp) ?? 0) + 1);
          }
        }
      }

      // 3. Zaangażowanie w sondaże i edukację
      if (r.event === "poll_source_click" && meta) {
        pollInstituteClicks.set(meta, (pollInstituteClicks.get(meta) ?? 0) + 1);
      } else if (r.event === "poll_tab_change" && meta) {
        const tabLabel = meta === "average" ? "Średnia ważona" : meta === "trend" ? "Wykres trendów" : meta === "sources" ? "Badania i źródła" : meta;
        pollTabChanges.set(tabLabel, (pollTabChanges.get(tabLabel) ?? 0) + 1);
      } else if (r.event === "district_view" && meta) {
        districtViews.set(meta, (districtViews.get(meta) ?? 0) + 1);
      } else if (r.event === "coalition_test" && meta) {
        const [coalitionName = meta, maj] = meta.split(":");
        const entry = coalitionTests.get(coalitionName) ?? { count: 0, majorityHits: 0 };
        entry.count += 1;
        if (maj === "tak" || maj === "wiekszosc") entry.majorityHits += 1;
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

    const funnelSessions = totalSessions;
    const funnelInteractions = rows.filter((r) => r.event === "funnel_step" && (r.payload as any)?.meta === "interaction").length;
    const funnelExports = rows.filter((r) => r.event === "funnel_step" && (r.payload as any)?.meta === "export").length;
    const hasFunnel = funnelSessions > 0 || funnelInteractions > 0 || funnelExports > 0;
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
          const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 15));
          const monthName = new Intl.DateTimeFormat("pl-PL", { month: "long" }).format(d);
          label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
        } catch {
          label = ym;
        }
        monthMap.set(ym, { month: ym, label, count: 0, days: [] });
      }
      const mObj = monthMap.get(ym);
      if (!mObj) continue;
      mObj.count += count;
      mObj.days.push({ day, count });
    }
    const visitsByMonth = [...monthMap.values()].sort((a, b) => b.month.localeCompare(a.month));

    // Tygodnie (od poniedziałku, czas polski) i ranking miesięcy
    const weekMap = new Map<string, number>();
    for (const { day, count } of visitsByDay) {
      const d = new Date(`${day}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const wk = d.toISOString().slice(0, 10);
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + count);
    }
    const visitsByWeek = [...weekMap.entries()].map(([week, count]) => ({ week, count })).sort((a, b) => b.week.localeCompare(a.week));
    const topWeeks = [...visitsByWeek].sort((a, b) => b.count - a.count).slice(0, 5);
    const topMonths = [...visitsByMonth].sort((a, b) => b.count - a.count).slice(0, 5).map(({ month, label, count }) => ({ month, label, count }));
    const scenarioActivity = new Map<string, { saves: number; links: number; images: number }>();
    const scenarioTraitCounts = new Map<string, number>();
    for (const r of rows) {
      const kind = r.event === "scenario_save" ? "saves" : r.event === "share_link_create" ? "links" : r.event === "social_image_download" ? "images" : null;
      if (!kind) continue;
      const ym = getPolishDay(r.created_at).slice(0, 7);
      const acc = scenarioActivity.get(ym) ?? { saves: 0, links: 0, images: 0 };
      acc[kind] += 1;
      scenarioActivity.set(ym, acc);
      const meta = (r.payload as { meta?: string | null })?.meta;
      if (meta && kind !== "images") for (const tag of meta.split(", ")) scenarioTraitCounts.set(tag, (scenarioTraitCounts.get(tag) ?? 0) + 1);
    }

    const pageViewsByPath = [...pagePathCounts.entries()]
      .map(([path, count]) => ({
        path,
        label: PATH_NAMES[path] ?? path,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const sourcesViews = countBy("sources_view") + (pagePathCounts.get("/zrodla") ?? 0);
    const pkwCorrectionViews = countBy("pkw_correction_view") + (pagePathCounts.get("/korekta-okregow") ?? 0);
    const pkwCorrectionToggles = countBy("demographic_adjustment_toggle") + (mapModeCounts.get("korekta_okregow") ?? 0);
    const dhondtViews = countBy("dhondt_guide_view") + (pagePathCounts.get("/metoda-dhondta") ?? 0);
    const aboutViews = countBy("about_view") + (pagePathCounts.get("/o-projekcie") ?? 0);
    const pollSectionViews = countBy("poll_section_view");
    const pollSourceClicks = countBy("poll_source_click");

    const turnoutBuckets = new Map<string, number>();
    for (const t of turnoutValues) {
      const b = `${Math.floor(t / 5) * 5}-${Math.floor(t / 5) * 5 + 5}%`;
      turnoutBuckets.set(b, (turnoutBuckets.get(b) ?? 0) + 1);
    }

    const nowIso = new Date().toISOString();
    const activeShares = countTotalActiveShares(nowIso);
    const dbStats = getDbStats();
    const feedback = getFeedbackSummary(20);
    const shareLibrary = getShareLibraryStats(nowIso);
    const coalitionTestCount = [...coalitionTests.values()].reduce((sum, item) => sum + item.count, 0);
    const coalitionMajorityHits = [...coalitionTests.values()].reduce((sum, item) => sum + item.majorityHits, 0);
    const weekdayLabels = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

    return {
      ok: true as const,
      eventCounts: [...eventCounts.entries()].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count),
      metaCounts: [...metaCounts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 60),
      pageViewsByHourUtc: hours,
      pageViewsByHourPolish: hoursPolish,
      turnoutBuckets: [...turnoutBuckets.entries()].map(([bucket, count]) => ({ bucket, count })).sort((a, b) => a.bucket.localeCompare(b.bucket, undefined, { numeric: true })),
      activeShares,
      totalEvents: totalEventsInDb,
      sessions: totalSessions,
      pageViews: totalPageViews,
      pageViewsByPath,
      sourcesViews,
      pkwCorrectionViews,
      pkwCorrectionToggles,
      dhondtViews,
      aboutViews,
      pollStats: {
        sectionViews: pollSectionViews,
        sourceClicks: pollSourceClicks,
        topInstitutes: [...pollInstituteClicks.entries()].map(([institute, count]) => ({ institute, count })).sort((a, b) => b.count - a.count),
        tabChanges: [...pollTabChanges.entries()].map(([tab, count]) => ({ tab, count })).sort((a, b) => b.count - a.count),
      },
      funnel: hasFunnel ? {
        sessions: funnelSessions,
        interactions: funnelInteractions,
        exports: funnelExports,
      } : null,
      utmSources: [...utmSourceCounts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      utmCampaigns: [...utmCampaignCounts.entries()].map(([campaign, count]) => ({ campaign, count })).sort((a, b) => b.count - a.count),
      supportClicks: countBy("support_click"),
      contactClicks: countBy("contact_click"),
      aboutViews: countBy("about_view"),
      scenarioSaves: countBy("scenario_save"),
      scenarioDownloads: countBy("scenario_download"),
      scenarioShares: countBy("scenario_share"),
      turnoutSets: countBy("turnout_set"),
      avgTurnout,
      avgShares,
      partyLabels,
      visitsByDay,
      visitsByMonth,
      visitsByWeek: visitsByWeek.slice(0, 12),
      topWeeks,
      topMonths,
      scenarioActivityByMonth: [...scenarioActivity.entries()].map(([month, v]) => ({ month, ...v })).sort((a, b) => b.month.localeCompare(a.month)),
      scenarioTraits: [...scenarioTraitCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
      socialImageDownloads: countBy("social_image_download"),
      // Enriched options
      topDistricts: [...districtViews.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12),
      topCoalitions: [...coalitionTests.entries()].map(([members, data]) => ({ members, count: data.count, majorityHits: data.majorityHits })).sort((a, b) => b.count - a.count).slice(0, 10),
      coalitionTestCount,
      coalitionMajorityHits,
      weekdayVisits: weekdayLabels.map((label, index) => ({ label, count: weekdayVisits[index] ?? 0 })),
      feedback,
      shareLibrary,
      partyAdjustments: [...partyAdjustments.entries()].map(([party, count]) => ({ party, count })).sort((a, b) => b.count - a.count),
      mapModes: [...mapModeCounts.entries()].map(([mode, count]) => ({ mode, count })).sort((a, b) => b.count - a.count),
      historicalViews: [...historyYearCounts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.count - a.count),
      turnoutGroupMoves: [...turnoutGroupCounts.entries()].map(([move, count]) => ({ move, count })).sort((a, b) => b.count - a.count),
      deviceBreakdown: [...deviceCounts.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count),
      trafficSources: [...trafficSources.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      dbStats,
      webhookConfigured: Boolean(process.env["DISCORD_FEEDBACK_WEBHOOK_URL"]?.trim()),
      securityKeys: listSecurityOverrideKeys(),
      generatedImagesCount: listGeneratedImages(1000).length,
      isLocalIp: auth.isLocal ?? false,
    };
  });

export const testFeedbackWebhook = createServerFn({ method: "POST" })
  .inputValidator((data) => summarySchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) {
      return { ok: false as const, error: "Brak uprawnień." };
    }
    const webhook = process.env["DISCORD_FEEDBACK_WEBHOOK_URL"]?.trim();
    if (!webhook) {
      return { ok: false as const, error: "Brak zdefiniowanego DISCORD_FEEDBACK_WEBHOOK_URL w zmiennych środowiskowych." };
    }
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
              title: "🔔 Test webhooka SejmSim",
              description: "To jest wiadomość testowa wysłana z panelu administratora sejmsim.pl.",
              color: 0x22c55e,
              fields: [
                { name: "Status", value: "Działa poprawnie! ✅", inline: true },
                { name: "Środowisko", value: "jifo-server", inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false as const, error: `Discord zwrócił błąd [${res.status}]: ${text}` };
      }
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: `Błąd połączenia: ${err instanceof Error ? err.message : String(err)}` };
    }
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

const recoveryActionSchema = z.object({
  login: z.string().max(50),
  key: z.string().min(1).max(200),
  recoveryPassword: z.string().min(1).max(200),
  label: z.string().max(80).optional(),
  id: z.number().int().optional(),
});

export const revealRecoveryKeysFn = createServerFn({ method: "POST" })
  .inputValidator((data) => recoveryActionSchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) {
      return { ok: false as const, error: "Brak uprawnień właściciela." };
    }
    const { revealSecurityOverrideKeys } = await import("./server-db.server");
    return revealSecurityOverrideKeys(data.recoveryPassword);
  });

export const generateRecoveryKeyFn = createServerFn({ method: "POST" })
  .inputValidator((data) => recoveryActionSchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) {
      return { ok: false as const, error: "Brak uprawnień właściciela." };
    }
    const { generateSecurityOverrideKey } = await import("./server-db.server");
    return generateSecurityOverrideKey(data.label || "", data.recoveryPassword);
  });

export const revokeRecoveryKeyFn = createServerFn({ method: "POST" })
  .inputValidator((data) => recoveryActionSchema.parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) {
      return { ok: false as const, error: "Brak uprawnień właściciela." };
    }
    if (typeof data.id !== "number") {
      return { ok: false as const, error: "Brak ID klucza." };
    }
    const { revokeSecurityOverrideKey } = await import("./server-db.server");
    return revokeSecurityOverrideKey(data.id, data.recoveryPassword);
  });

