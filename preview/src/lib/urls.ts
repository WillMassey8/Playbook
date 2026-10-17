/** Collapse common social URL variants so re-shares match the same play. */
export function canonicalizeSourceUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (
      key.startsWith("utm_") ||
      key === "s" ||
      key === "t" ||
      key === "ref_src" ||
      key === "ref_url" ||
      key === "fbclid" ||
      key === "igshid"
    ) {
      u.searchParams.delete(key);
    }
  }
  let host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (
    host === "mobile.twitter.com" ||
    host === "mobile.x.com" ||
    host === "twitter.com"
  ) {
    host = "x.com";
  }
  u.hostname = host;
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }
  return u.toString();
}
