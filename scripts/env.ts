/**
 * Reads `.env.local` for the Node scripts (Expo does this for the app). Real environment variables
 * win over the file, so a key can also be passed inline for one run.
 */
import fs from "node:fs";

export function loadEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  const file = new URL("../.env.local", import.meta.url);
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
