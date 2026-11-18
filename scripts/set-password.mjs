// Sets (or changes) the /dashboard username and password on the live site.
// Usage: npm run set-password   (from elsewhere: npm --prefix ~/Desktop/Projects/liveradio run set-password)
//
// Mac dialogs ask for the username, then the password twice (typing hidden). Both go straight to Cloudflare as the
// Worker's STATS_USERNAME and STATS_PASSWORD secrets: never printed, saved to a file or put in the repo. Changing
// either signs out every browser that was signed in to the dashboard.
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIN_USERNAME = 3;
const MIN_PASSWORD = 8;

function ask(message, hidden = true) {
  const script = `text returned of (display dialog ${JSON.stringify(message)} default answer ""${hidden ? " with hidden answer" : ""} with title "LiveRadio dashboard" buttons {"Cancel", "OK"} default button "OK")`;
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).replace(/\r?\n$/, "");
  } catch {
    console.log("Cancelled. Nothing was changed.");
    process.exit(1);
  }
}

function putSecret(name, value) {
  return new Promise((resolve) => {
    const wrangler = spawn("npx", ["wrangler", "secret", "put", name], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    wrangler.stdout.on("data", (chunk) => (output += chunk));
    wrangler.stderr.on("data", (chunk) => (output += chunk));
    wrangler.stdin.end(value);
    // Wrangler's own messages never contain the value.
    wrangler.on("close", (code) => resolve({ code: code ?? 1, output: output.trim() }));
  });
}

if (process.platform !== "darwin") {
  console.log("This uses Mac dialogs. Elsewhere run: npx wrangler secret put STATS_USERNAME, then STATS_PASSWORD");
  process.exit(1);
}

let username = ask(`Username for liveradio.space/dashboard (${MIN_USERNAME} or more characters):`, false).trim();
while (username.length < MIN_USERNAME) {
  username = ask(`That was ${username.length} characters. Please use ${MIN_USERNAME} or more:`, false).trim();
}
let password = ask(`New password (${MIN_PASSWORD} or more characters):`);
while (password.length < MIN_PASSWORD) {
  password = ask(`That was ${password.length} characters. Please use ${MIN_PASSWORD} or more:`);
}
if (ask("Type the same password again:") !== password) {
  console.log("The two passwords were different. Nothing was changed; run it again.");
  process.exit(1);
}

console.log("Saving the username and password on Cloudflare…");
for (const [name, value] of [
  ["STATS_USERNAME", username],
  ["STATS_PASSWORD", password],
]) {
  const { code, output } = await putSecret(name, value);
  if (code !== 0) {
    console.log(output);
    console.log(`Saving ${name} failed (see above).${name === "STATS_PASSWORD" ? " The username was already saved; run it again." : " Nothing was changed."}`);
    process.exit(code);
  }
}
username = "";
password = "";
console.log("Done. Sign in at https://liveradio.space/dashboard with the new username and password.");
