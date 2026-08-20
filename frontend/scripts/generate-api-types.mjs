#!/usr/bin/env node
/**
 * Generate frontend/lib/generated/api-schema.ts from FastAPI's public OpenAPI.
 *
 * Requires the backend Python environment (venv or CI python + requirements).
 * Does not start FastAPI and does not call upstream weather or geocoding providers.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(frontendRoot, "..");
const backendRoot = path.join(repoRoot, "backend");
const exportScript = path.join(backendRoot, "scripts", "export_openapi.py");
const outFile = path.join(frontendRoot, "lib", "generated", "api-schema.ts");

const HEADER = `/**
 * THIS FILE IS GENERATED.
 * DO NOT EDIT MANUALLY.
 *
 * Source: FastAPI public OpenAPI (backend/scripts/export_openapi.py).
 * Regenerate: npm run generate:api-types
 */

`;

const FORBIDDEN = [
  ["WEATHERAI", "_API_KEY"].join(""),
  ["api", "weather-ai", "co"].join("."),
  ["photon", "komoot", "io"].join("."),
  ["ipwho", "is"].join("."),
  "wai_",
  ["Author", "ization"].join(""),
];

function findPython() {
  if (process.env.BACKEND_PYTHON) return process.env.BACKEND_PYTHON;
  const venvUnix = path.join(backendRoot, ".venv", "bin", "python");
  const venvWin = path.join(backendRoot, ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvUnix)) return venvUnix;
  if (fs.existsSync(venvWin)) return venvWin;
  return "python3";
}

function exportOpenAPI() {
  const python = findPython();
  const result = spawnSync(python, [exportScript], {
    cwd: backendRoot,
    env: { ...process.env, PYTHONPATH: backendRoot },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(
      `Failed to export OpenAPI with ${python} (exit ${result.status}). ` +
        `Install backend requirements and retry. ${detail}`
    );
  }
  return JSON.parse(result.stdout);
}

function assertPublicSchema(schema) {
  const names = Object.keys(schema?.components?.schemas ?? {});
  for (const name of names) {
    if (name.startsWith("Upstream")) {
      throw new Error(`Public OpenAPI leaked upstream model: ${name}`);
    }
  }
  const dumped = JSON.stringify(schema);
  for (const needle of FORBIDDEN) {
    if (dumped.includes(needle)) {
      throw new Error(`Public OpenAPI contained forbidden string: ${needle}`);
    }
  }
}

const check = process.argv.includes("--check");
const schema = exportOpenAPI();
assertPublicSchema(schema);

const ast = await openapiTS(schema, {
  alphabetize: true,
  defaultNonNullable: false,
  enum: false,
  silent: true,
});
const generated = HEADER + astToString(ast);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, generated, "utf8");

if (check) {
  const status = spawnSync(
    "git",
    ["status", "--porcelain", "--", "frontend/lib/generated/api-schema.ts"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  const dirty = (status.stdout || "").trim();
  if (status.status !== 0 || dirty) {
    process.stderr.write(
      "Generated API types are out of date or untracked. Run `npm run generate:api-types` and commit.\n"
    );
    if (dirty) process.stderr.write(`${dirty}\n`);
    if (status.stderr) process.stderr.write(status.stderr);
    process.exit(status.status && status.status !== 0 ? status.status : 1);
  }
}
