import { FALLBACK_EXPORTS, jsrModUrl } from "./constants.ts";
import { normalizePackagePath } from "./path.ts";

const EXPORT_LINE_RE =
  /export\s*\{\s*([^}]+)\s*\}\s*from\s*["']([^"']+)["']\s*;?/g;

export interface ExportEntry {
  name: string;
  modulePath: string;
}

export function parseModExports(modSource: string): ExportEntry[] {
  const entries: ExportEntry[] = [];
  for (const match of modSource.matchAll(EXPORT_LINE_RE)) {
    const names = match[1].split(",").map((n) => n.trim()).filter(Boolean);
    const modulePath = match[2];
    for (const name of names) {
      entries.push({ name, modulePath });
    }
  }
  return entries;
}

export async function fetchExportNames(version: string): Promise<string[]> {
  const url = jsrModUrl(version);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch mod.ts for version ${version} (${response.status}).`,
    );
  }
  const source = await response.text();
  const names = parseModExports(source).map((e) => e.name);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export async function listExportNames(
  version: string,
): Promise<string[]> {
  try {
    return await fetchExportNames(version);
  } catch {
    console.warn(
      "Warning: Could not fetch exports from JSR; using built-in fallback list.",
    );
    return [...FALLBACK_EXPORTS];
  }
}

export async function fetchModExportEntries(
  version: string,
): Promise<ExportEntry[]> {
  const url = jsrModUrl(version);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch mod.ts for version ${version} (${response.status}).`,
    );
  }
  const source = await response.text();
  return parseModExports(source);
}

export async function fetchExportMap(
  version: string,
): Promise<Map<string, string>> {
  const entries = await fetchModExportEntries(version);
  const map = new Map<string, string>();
  for (const { name, modulePath } of entries) {
    map.set(name, modulePath);
  }
  return map;
}

export function buildExportsByPath(
  entries: ExportEntry[],
): Map<string, string[]> {
  const byPath = new Map<string, string[]>();
  for (const { name, modulePath } of entries) {
    const path = normalizePackagePath(modulePath);
    const list = byPath.get(path) ?? [];
    list.push(name);
    byPath.set(path, list);
  }
  for (const [path, names] of byPath) {
    byPath.set(path, [...new Set(names)].sort((a, b) => a.localeCompare(b)));
  }
  return byPath;
}

export async function fetchExportsByPath(
  version: string,
): Promise<Map<string, string[]>> {
  const entries = await fetchModExportEntries(version);
  return buildExportsByPath(entries);
}
