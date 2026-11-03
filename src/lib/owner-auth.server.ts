import { getRequestHeader } from "@tanstack/react-start/server";
import {
  countRecentFailedAttempts,
  recordFailedLoginAttempt,
  clearFailedAttemptsForIp,
  useSecurityOverrideKey,
} from "./server-db.server";

export const OWNER_LOGIN = "JIFO";

/** Sprawdza, czy podany adres IP należy do sieci lokalnej (tej samej co użytkownik i jifo-server). */
export function isLocalIp(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  const cleanIp = ip.trim();
  if (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp === "localhost" ||
    cleanIp === "::ffff:127.0.0.1"
  ) {
    return true;
  }
  // Standardowe zakresy prywatne IPv4:
  // 10.0.0.0 - 10.255.255.255
  if (/^(::ffff:)?10\./.test(cleanIp)) return true;
  // 172.16.0.0 - 172.31.255.255
  if (/^(::ffff:)?172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  // 192.168.0.0 - 192.168.255.255 (sieć domowa/lokalna z jifo-server)
  if (/^(::ffff:)?192\.168\./.test(cleanIp)) return true;
  // 169.254.0.0/16 (link-local)
  if (/^(::ffff:)?169\.254\./.test(cleanIp)) return true;
  // Zakresy lokalne IPv6: fe80::/10 (link-local), fc00::/7 (unique local address)
  if (/^(fe80:|fc|fd)/i.test(cleanIp)) return true;
  return false;
}

export function getClientIp(): string {
  try {
    return (
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-real-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1"
    );
  } catch {
    return "127.0.0.1";
  }
}

/** Panel właściciela: login JIFO + klucz/hasło z sekretu ANALYTICS_KEY. */
export function isOwner(login: string, key: string): boolean {
  const expected = process.env["ANALYTICS_KEY"];
  if (!expected || expected.length < 12) return false;
  return login.trim().toUpperCase() === OWNER_LOGIN && key === expected;
}

export interface OwnerAuthResult {
  ok: boolean;
  error?: string;
  isLocal?: boolean;
  locked?: boolean;
  remainingAttempts?: number;
}

/**
 * Weryfikacja dostępu właściciela:
 * - Uwierzytelnienie kluczem ANALYTICS_KEY (hasłem) lub jednym z 64-znakowych jednorazowych kluczy bezpieczeństwa.
 * - Dla wszystkich IP spoza sieci lokalnej limit wynosi maksymalnie 5 nieudanych prób na 12h.
 * - Po 5 nieudanych próbach dostęp jest zablokowany, chyba że podany zostanie 64-znakowy klucz bezpieczeństwa.
 */
export async function verifyOwnerAccess(params: {
  login: string;
  key: string;
  securityKey?: string | undefined;
}): Promise<OwnerAuthResult> {
  const clientIp = getClientIp();
  const local = isLocalIp(clientIp);

  const trimmedKey = params.key.trim();
  const trimmedSecKey = params.securityKey?.trim() ?? "";

  // 1. Sprawdzenie, czy użytkownik loguje się bezpośrednio 64-znakowym kluczem bezpieczeństwa (wpisanym w pole klucza)
  if (trimmedKey.length === 64) {
    if (useSecurityOverrideKey(trimmedKey)) {
      clearFailedAttemptsForIp(clientIp);
      return { ok: true, isLocal: local };
    }
  }

  // 2. Jeśli jest w sieci lokalnej (jifo-server), brak limitu prób
  if (local) {
    if (!isOwner(params.login, params.key)) {
      return { ok: false, error: "Nieprawidłowy klucz dostępu (lub login).", isLocal: true };
    }
    return { ok: true, isLocal: true };
  }

  // 3. IP spoza sieci lokalnej - sprawdzamy limit prób
  const failedAttempts = countRecentFailedAttempts(clientIp, 12);
  let unlockedBySecurityKey = false;

  if (trimmedSecKey.length === 64) {
    if (useSecurityOverrideKey(trimmedSecKey)) {
      unlockedBySecurityKey = true;
      clearFailedAttemptsForIp(clientIp);
    } else {
      return {
        ok: false,
        error: "Podany 64-znakowy klucz bezpieczeństwa jest nieprawidłowy lub został już wykorzystany (jednorazowa zabawka).",
        locked: failedAttempts >= 5,
        remainingAttempts: Math.max(0, 5 - failedAttempts),
        isLocal: false,
      };
    }
  }

  // Jeśli brak ważnego klucza odblokowującego i jest już >= 5 błędnych prób w ciągu 12h -> blokada
  if (!unlockedBySecurityKey && failedAttempts >= 5) {
    return {
      ok: false,
      error: "Przekroczono limit prób dostępu (5 nieudanych prób na 12h dla zewnętrznych IP). Wprowadź 64-znakowy jednorazowy klucz bezpieczeństwa, aby odblokować dostęp.",
      locked: true,
      remainingAttempts: 0,
      isLocal: false,
    };
  }

  // Weryfikacja głównego klucza dostępu (ANALYTICS_KEY)
  if (!isOwner(params.login, params.key)) {
    recordFailedLoginAttempt(clientIp);
    const newFails = countRecentFailedAttempts(clientIp, 12);
    const remaining = Math.max(0, 5 - newFails);

    if (remaining === 0) {
      return {
        ok: false,
        error: "Nieprawidłowy klucz dostępu. Osiągnięto limit 5 nieudanych prób na 12h. Dostęp z tego IP został zablokowany — wymagany 64-znakowy klucz bezpieczeństwa.",
        locked: true,
        remainingAttempts: 0,
        isLocal: false,
      };
    }

    return {
      ok: false,
      error: `Nieprawidłowy klucz dostępu. Pozostało prób: ${remaining} na 12h (limit dla IP zewnętrznych).`,
      remainingAttempts: remaining,
      isLocal: false,
    };
  }

  // Sukces - czyścimy ewentualne wcześniejsze błędy z tego IP
  clearFailedAttemptsForIp(clientIp);
  return { ok: true, isLocal: false };
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
