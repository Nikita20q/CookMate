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
