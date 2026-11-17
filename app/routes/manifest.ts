export function loader() {
  const manifest = {
    name: "LiveRadio",
    short_name: "LiveRadio",
    description: "Live radio from every country, free in your browser.",
    start_url: "/?utm_source=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#f3eee3",
    theme_color: "#16130f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400, s-maxage=86400" },
  });
}
