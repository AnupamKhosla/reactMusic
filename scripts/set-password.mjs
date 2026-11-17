// Sets (or changes) the /dashboard password on the live site.
// Usage: npm run set-password   (from the chess-ai folder: npm --prefix tmp/liveradio run set-password)
//
// A Mac dialog asks for the password twice, with the typing hidden. The password goes straight to Cloudflare as the
// Worker's STATS_PASSWORD secret: it is never printed, saved to a file or put in the repo. Changing it signs out
// every browser that was signed in to the dashboard.
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIN_LENGTH = 8;

function ask(message) {
  const script = `text returned of (display dialog ${JSON.stringify(message)} default answer "" with hidden answer with title "LiveRadio dashboard" buttons {"Cancel", "OK"} default button "OK")`;
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).replace(/\r?\n$/, "");
  } catch {
    console.log("Cancelled. The password was not changed.");
    process.exit(1);
  }
}

if (process.platform !== "darwin") {
  console.log("This uses a Mac dialog. Elsewhere run: npx wrangler secret put STATS_PASSWORD");
  process.exit(1);
}

let password = ask(`New password for liveradio.space/dashboard (${MIN_LENGTH} or more characters):`);
while (password.length < MIN_LENGTH) {
  password = ask(`That was ${password.length} characters. Please use ${MIN_LENGTH} or more:`);
}
if (ask("Type the same password again:") !== password) {
  console.log("The two passwords were different. Nothing was changed; run it again.");
  process.exit(1);
}

console.log("Saving the password on Cloudflare…");
const wrangler = spawn("npx", ["wrangler", "secret", "put", "STATS_PASSWORD"], {
  cwd: root,
  stdio: ["pipe", "pipe", "pipe"],
});
let output = "";
wrangler.stdout.on("data", (chunk) => (output += chunk));
wrangler.stderr.on("data", (chunk) => (output += chunk));
wrangler.stdin.end(password);
wrangler.on("close", (code) => {
  password = "";
  if (code === 0) {
    console.log("Done. Sign in at https://liveradio.space/dashboard with the new password.");
  } else {
    // Wrangler's own message, which never contains the password.
    console.log(output.trim());
    console.log("Saving failed (see above). Nothing was changed.");
    process.exit(code ?? 1);
  }
});
