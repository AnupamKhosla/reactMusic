import { SITE_URL } from "~/lib/seo";

// 18 Nov 2026: OpenAI's training crawler (GPTBot) made 26,000 of the site's 34,000 requests in a day, walking every
// station page, and pushed the Worker past the free plan's CPU limit. It is shut out; ChatGPT search
// (OAI-SearchBot) and links people open from ChatGPT (ChatGPT-User) still reach every page.
// Other orders of a list (?sort=) are the same stations again and are noindex anyway: no crawler needs them.
// /dashboard is not named here (that would advertise it); the Worker answers 404 to crawlers there.
export function loader() {
  const body = [
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /*?*sort=",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
