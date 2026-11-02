import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Bun does not auto-load .dev.vars, so scripts merge it into process.env. */
export function loadDevVars(): void {
  const file = resolve(process.cwd(), ".dev.vars");
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  } catch {
    // .dev.vars is optional for scripts.
  }
}
