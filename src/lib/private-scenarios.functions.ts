import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saveSchema = z.object({
  name: z.string().trim().min(1).max(60),
  scenario: z
    .record(z.string(), z.unknown())
    .refine((s) => s["version"] === 1 && typeof s["districts"] === "object" && typeof s["parties"] === "object", "zły format")
    .refine((s) => JSON.stringify(s).length < 200_000, "za duży"),
});

/** Kopia zapisanego scenariusza do wglądu właściciela. Bez IP i identyfikatorów; obrazy partii nigdy nie są częścią scenariusza. */
export const savePrivateScenario = createServerFn({ method: "POST" })
  .inputValidator((data) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { insertPrivateScenario } = await import("./server-db.server");
      insertPrivateScenario(data.name, data.scenario);
      return { ok: true };
    } catch (err) {
      console.error("private scenario insert error", err);
      return { ok: false };
    }
  });

const ownerSchema = z.object({ login: z.string().max(50), key: z.string().min(1).max(200) });

export const listPrivateScenariosFn = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyOwnerAccess } = await import("./owner-auth.server");
    const auth = await verifyOwnerAccess(data);
    if (!auth.ok) return { ok: false as const, error: auth.error, items: [] };
    const { listPrivateScenarios } = await import("./server-db.server");
    const items = listPrivateScenarios().map((r) => {
      const districts = r.scenario["districts"];
      let filledDistricts = 0;
      if (districts && typeof districts === "object") {
        for (const d of Object.values(districts as Record<string, unknown>)) {
          const shares = d && typeof d === "object" ? (d as Record<string, unknown>)["shares"] : null;
          if (!shares || typeof shares !== "object") continue;
          const nonInne = Object.entries(shares as Record<string, unknown>)
            .filter(([k, v]) => k !== "inne" && typeof v === "number" && v > 0)
            .reduce((sum, [, v]) => sum + (v as number), 0);
          if (nonInne > 0.5) filledDistricts++;
        }
      }
      return {
        id: r.id,
        name: r.name,
        created_at: r.created_at,
        author: typeof r.scenario["author"] === "string" ? r.scenario["author"] : "",
        description: typeof r.scenario["description"] === "string" ? r.scenario["description"] : "",
        filledDistricts,
        json: JSON.stringify(r.scenario, null, 2),
      };
    });
    return { ok: true as const, items };
  });

export const deletePrivateScenarioFn = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.number().int() }).parse(data))
  .handler(async ({ data }) => {
    const { verifyOwnerAccess } = await import("./owner-auth.server");
    const auth = await verifyOwnerAccess(data);
    if (!auth.ok) return { ok: false, error: auth.error };
    const { deletePrivateScenario } = await import("./server-db.server");
    return { ok: deletePrivateScenario(data.id) };
  });
