import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saveSchema = z.object({
  name: z.string().trim().min(1).max(60),
  scenario: z
    .record(z.string(), z.unknown())
    .refine((s) => s["version"] === 1 && typeof s["districts"] === "object", "zły format")
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
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false as const, items: [] };
    const { listPrivateScenarios } = await import("./server-db.server");
    return { ok: true as const, items: listPrivateScenarios() };
  });

export const deletePrivateScenarioFn = createServerFn({ method: "POST" })
  .inputValidator((data) => ownerSchema.extend({ id: z.number().int() }).parse(data))
  .handler(async ({ data }) => {
    const { isOwner } = await import("./owner-auth.server");
    if (!isOwner(data.login, data.key)) return { ok: false };
    const { deletePrivateScenario } = await import("./server-db.server");
    return { ok: deletePrivateScenario(data.id) };
  });
