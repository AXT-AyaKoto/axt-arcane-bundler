import { jsrFileUrl } from "./constants.ts";

const RELATIVE_IMPORT_LINE_RE =
  /^\s*import\s+(?:type\s+)?[\s\w*{},\n]+\s+from\s+["']\.\/[^"']+["']\s*;?\s*$/gm;

/** Arcane source section banners (`// ===...`, `// Imports`, etc.). */
const ARCANE_SECTION_BLOCK_RE =
  /^\/\/ ={64}\n(?:^\/\/ .+\n)+^\/\/ ={64}\n/gm;

export async function mergeTypeScriptSources(
  fetchVersion: string,
  packagePaths: string[],
  selectedExports: string[],
  specifier: string,
): Promise<string> {
  const parts: string[] = [
    "// ======== Bundled from AyaExpTech Arcane ========",
    `// Package: ${specifier}`,
    `// Resolved version (sources): ${fetchVersion}`,
    `// Selected exports: ${selectedExports.join(", ")}`,
    "",
  ];

  for (const pkgPath of packagePaths) {
    const url = jsrFileUrl(fetchVersion, pkgPath);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    let source = await response.text();
    source = source.replace(RELATIVE_IMPORT_LINE_RE, "");
    source = source.replace(ARCANE_SECTION_BLOCK_RE, "");
    source = source.replace(/\n{3,}/g, "\n\n").trimEnd();

    const label = pkgPath.replace(/^\//, "");
    parts.push(`// --- ${label} ---`, "", source, "");
  }

  parts.push("// ======== Bundled from AyaExpTech Arcane (End) ========");

  return parts.join("\n").trimEnd() + "\n";
}
