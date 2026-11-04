// This only checks claims for client UX. The server verifies the JWT signature.
export function readSession(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const { sub, exp } = JSON.parse(atob(payload));
    if (
      typeof sub !== "string" || !/^[1-9]\d*$/.test(sub) ||
      typeof exp !== "number" || !Number.isFinite(exp) || exp <= 0 ||
      !Number.isFinite(exp * 1000)
    ) return null;
    return { userId: sub, expiresAt: exp * 1000 };
  } catch {
    return null;
  }
}

export function isSessionValid(token: string | null) {
  const session = readSession(token);
  return session !== null && session.expiresAt > Date.now();
}

export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" || !value.startsWith("/") ||
    value.startsWith("//") || value.includes("\\") ||
    [...value].some((character) => character.charCodeAt(0) <= 32) ||
    /%2f|%5c/i.test(value)
  ) return "/";
  try {
    const url = new URL(value, "https://cookmate.local");
    if (url.origin !== "https://cookmate.local" ||
        !/^\/(?:favorites|recipes(?:\/[^/]+)?)?$/.test(url.pathname)) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

export function authSearch(search: Record<string, unknown>): { returnTo?: string } {
  return search.returnTo === undefined ? {} : { returnTo: safeReturnTo(search.returnTo) };
}
