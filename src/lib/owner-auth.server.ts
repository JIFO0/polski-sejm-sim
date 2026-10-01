export const OWNER_LOGIN = "JIFO";

/** Panel właściciela: login JIFO + hasło z sekretu ANALYTICS_KEY (lub hasło główne). */
export function isOwner(login: string, key: string) {
  const expected = process.env["ANALYTICS_KEY"] || "L7HJ,+Ki(aW]2^PtwZsKX$^}";
  return login.trim().toUpperCase() === OWNER_LOGIN && key === expected;
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
