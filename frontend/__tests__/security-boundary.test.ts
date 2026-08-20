/**
 * Security boundary tests for the Next.js data layer.
 *
 * The browser must never learn about WeatherAI credentials or URLs.
 * BACKEND_URL is server-side only (no NEXT_PUBLIC_ prefix).
 *
 * Tests are excluded from the source scan because they mention forbidden
 * strings in order to assert their absence.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", "coverage", "__tests__"]);
const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".env") && !entry.name.endsWith(".example")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    const ext = path.extname(entry.name);
    if (SOURCE_EXTS.has(ext) || entry.name === ".env.local.example") {
      out.push(full);
    }
  }
  return out;
}

const UPSTREAM_HOST = ["api", "weather-ai", "co"].join(".");

describe("frontend security boundary", () => {
  const files = walk(FRONTEND_ROOT);

  it("does not contain WeatherAI credentials or the upstream URL", () => {
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/WEATHERAI_API_KEY/);
      expect(text, file).not.toMatch(/WEATHERAI_BASE_URL/);
      expect(text, file).not.toContain(UPSTREAM_HOST);
      expect(text, file).not.toMatch(/\bwai_[A-Za-z0-9]{8,}/);
      expect(text, file).not.toContain("photon.komoot.io");
      expect(text, file).not.toContain("ipwho.is");
    }
  });

  it("does not expose BACKEND_URL or WeatherAI secrets via NEXT_PUBLIC_", () => {
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/NEXT_PUBLIC_BACKEND_URL/);
      expect(text, file).not.toMatch(/NEXT_PUBLIC_WEATHERAI/);
      expect(text, file).not.toMatch(/NEXT_PUBLIC_.*API_KEY/);
    }
  });

  it("keeps BACKEND_URL server-side in the typed client", () => {
    const client = fs.readFileSync(
      path.join(FRONTEND_ROOT, "lib/api-client.ts"),
      "utf8"
    );
    expect(client).toMatch(/process\.env\.BACKEND_URL/);
    expect(client).not.toMatch(/NEXT_PUBLIC_/);
    expect(client).not.toContain(UPSTREAM_HOST);
    expect(client).not.toMatch(/Authorization/);
    expect(client).not.toMatch(/Bearer/);
  });

  it("documents BACKEND_URL without a NEXT_PUBLIC_ prefix", () => {
    const example = fs.readFileSync(
      path.join(FRONTEND_ROOT, ".env.local.example"),
      "utf8"
    );
    expect(example).toMatch(/^BACKEND_URL=/m);
    expect(example).not.toMatch(/NEXT_PUBLIC_/);
    expect(example).not.toMatch(/WEATHERAI/);
  });

  it("does not commit WeatherAI credentials in git-tracked frontend files", () => {
    const repoRoot = path.resolve(FRONTEND_ROOT, "..");
    const listed = execSync("git ls-files -- frontend", {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);

    expect(listed.length).toBeGreaterThan(0);
    for (const relative of listed) {
      if (relative.includes("__tests__")) continue;
      const full = path.join(repoRoot, relative);
      if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
      const text = fs.readFileSync(full, "utf8");
      expect(text, relative).not.toMatch(/WEATHERAI_API_KEY/);
      expect(text, relative).not.toMatch(/WEATHERAI_BASE_URL/);
      expect(text, relative).not.toContain(UPSTREAM_HOST);
      expect(text, relative).not.toMatch(/\bwai_[A-Za-z0-9]{8,}/);
      expect(text, relative).not.toMatch(/NEXT_PUBLIC_WEATHERAI/);
      expect(text, relative).not.toContain("photon.komoot.io");
      expect(text, relative).not.toContain("ipwho.is");
    }
  });
});
