import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uploadSchema = z.object({
  scenarioName: z.string().max(100),
  imageData: z.string().min(50).max(5_000_000),
});

export const uploadGeneratedGraphic = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    try {
      return uploadSchema.parse(data);
    } catch {
      return null;
    }
  })
  .handler(async ({ data }) => {
    if (!data || !data.imageData) return { ok: false };
    try {
      const { insertGeneratedImage } = await import("./server-db.server");
      insertGeneratedImage(data.scenarioName || "Scenariusz", data.imageData);
      return { ok: true };
    } catch (err) {
      console.error("[uploadGeneratedGraphic] error:", err);
      return { ok: false };
    }
  });

const ownerReqSchema = z.object({
  login: z.string().max(50),
  key: z.string().min(1).max(200),
  securityKey: z.string().max(100).optional(),
});

export const listGeneratedGraphicsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ownerReqSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyOwnerAccess } = await import("./owner-auth.server");
    const auth = await verifyOwnerAccess(data);
    if (!auth.ok) {
      return { ok: false as const, error: auth.error ?? "Brak dostępu." };
    }
    const { listGeneratedImages } = await import("./server-db.server");
    const items = listGeneratedImages(100);
    return { ok: true as const, items };
  });

const deleteSchema = z.object({
  login: z.string().max(50),
  key: z.string().min(1).max(200),
  securityKey: z.string().max(100).optional(),
  id: z.number().int().positive(),
});

export const deleteGeneratedGraphicFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyOwnerAccess } = await import("./owner-auth.server");
    const auth = await verifyOwnerAccess(data);
    if (!auth.ok) {
      return { ok: false as const, error: auth.error ?? "Brak dostępu." };
    }
    const { deleteGeneratedImage } = await import("./server-db.server");
    const success = deleteGeneratedImage(data.id);
    return { ok: success };
  });
