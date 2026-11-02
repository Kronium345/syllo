#!/usr/bin/env node
// Turns a Cloudflare API token value (from the general "Account API tokens" page, permission
// "Workers R2 Storage Bucket Item Write" on syllo-lesson-videos) into R2 S3 keys and saves
// them where prompts/15 needs them, without printing them:
//   Access Key ID     = the token's ID
//   Secret Access Key = SHA-256 (hex) of the token value   (Cloudflare R2 docs, "API tokens")
// Writes R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY into .env.local (replacing old values) and
// runs `npx supabase secrets set` for the lesson-video Edge Function.
//
// Run it in your own terminal (not with `!` inside Claude Code): node scripts/set-r2-token.mjs
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");

/** Reads one line without echoing it (shows * per character). */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.startsWith(question)) rl.output.write(question);
      else if (text !== "\r\n" && text !== "\n") rl.output.write("*".repeat(text.length));
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function setEnv(lines, name, value) {
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  if (index >= 0) lines[index] = `${name}=${value}`;
  else lines.push(`${name}=${value}`);
}

const tokenValue = await askHidden("Token value (shown once after creating it): ");
if (tokenValue.length < 30) {
  console.error("That token value looks too short. Nothing was changed.");
  process.exit(1);
}

// The token's ID (= the S3 Access Key ID) comes from Cloudflare's verify endpoint, so it
// doesn't have to be found in the dashboard. Account-owned tokens verify under the account.
try {
  process.loadEnvFile(envFile);
} catch {
  // No .env.local yet: only the user-token endpoint is tried.
}
const accountId = process.env.R2_ACCOUNT_ID?.trim();
const verifyUrls = [
  ...(accountId ? [`https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`] : []),
  "https://api.cloudflare.com/client/v4/user/tokens/verify",
];
let tokenId = null;
for (const url of verifyUrls) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${tokenValue}` } });
  const body = await response.json().catch(() => null);
  if (body?.success && body.result?.id) {
    tokenId = body.result.id;
    if (body.result.status !== "active") console.warn(`Note: Cloudflare says this token is "${body.result.status}".`);
    break;
  }
}
if (!tokenId) {
  console.error("Cloudflare didn't recognise that token value. Check you copied all of it. Nothing was changed.");
  process.exit(1);
}
console.log("Cloudflare verified the token.");
const secretAccessKey = createHash("sha256").update(tokenValue).digest("hex");

const lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split(/\r?\n/) : [];
while (lines.length && lines[lines.length - 1] === "") lines.pop();
setEnv(lines, "R2_ACCESS_KEY_ID", tokenId);
setEnv(lines, "R2_SECRET_ACCESS_KEY", secretAccessKey);
fs.writeFileSync(envFile, `${lines.join("\n")}\n`);
console.log("Saved R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to .env.local.");

const result = spawnSync(
  "npx",
  ["supabase", "secrets", "set", `R2_ACCESS_KEY_ID=${tokenId}`, `R2_SECRET_ACCESS_KEY=${secretAccessKey}`],
  { cwd: root, stdio: ["ignore", "ignore", "pipe"], shell: process.platform === "win32" },
);
if (result.status === 0) console.log("Set both as Supabase secrets for the lesson-video Edge Function. Done.");
else console.error(`Couldn't set the Supabase secrets (exit ${result.status}). Run npx supabase secrets set yourself.`);
