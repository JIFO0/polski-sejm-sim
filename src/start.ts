import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

import { getRequest } from "@tanstack/react-start/server";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Server error caught in middleware:", error);

    try {
      const req = getRequest();
      const accept = req?.headers?.get?.("accept") ?? "";
      const isServerFn =
        req?.url?.includes("/_serverFn") ||
        req?.headers?.has?.("x-tanstack-start-serverfn");

      if (isServerFn || !accept.includes("text/html")) {
        throw error;
      }

      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (e) {
      if (e === error) throw e;
      throw error;
    }
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  origin: (origin) => {
    if (!origin) return true;
    try {
      const u = new URL(origin);
      return (
        u.hostname === "sejmsim.pl" ||
        u.hostname.endsWith(".sejmsim.pl") ||
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1"
      );
    } catch {
      return false;
    }
  },
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
