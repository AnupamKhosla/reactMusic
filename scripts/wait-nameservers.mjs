// Waits until the .space registry delegates liveradio.space to Cloudflare, then until the site answers from the
// Worker over HTTPS. Polls every 30 s for up to 3 hours. Usage: node scripts/wait-nameservers.mjs
import { execFileSync } from "node:child_process";

const deadline = Date.now() + 3 * 3600_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function registryNameservers() {
  try {
    return execFileSync("dig", ["NS", "liveradio.space", "@ns01.trs-dns.com", "+norecurse", "+noall", "+authority"], { encoding: "utf8" });
  } catch {
    return "";
  }
}

while (!/cloudflare\.com/.test(registryNameservers())) {
  if (Date.now() > deadline) {
    console.log("Still not delegated to Cloudflare after 3 hours.");
    process.exit(1);
  }
  await sleep(30_000);
}
console.log(new Date().toISOString(), "registry now points at Cloudflare:");
console.log(registryNameservers().trim());

// Then wait for the site itself (Cloudflare activates the zone and issues its certificate).
while (Date.now() < deadline) {
  try {
    const res = await fetch("https://liveradio.space/", { redirect: "manual", signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    if (res.status === 200 && /dial-list/.test(html)) {
      console.log(new Date().toISOString(), "https://liveradio.space/ now serves the new site (status 200).");
      process.exit(0);
    }
  } catch {
    /* not resolving to Cloudflare here yet, or no certificate yet */
  }
  await sleep(30_000);
}
console.log("The registry switched, but the new site did not answer within 3 hours.");
process.exit(1);
