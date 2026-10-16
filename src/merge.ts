import {
  extractFromSource,
  fetchPackageSource,
  resolveExportsToExtract,
} from "./extract.ts";
import { type OutputLanguage, stripTypes } from "./strip.ts";

const BANNER =
  `// ==== Copied from "AyaExpTech Arcane" (using "AXT-AyaKoto/axt-arcane-bundler") ====`;
const BANNER_END =
  `// ==== Copied from "AyaExpTech Arcane" (using "AXT-AyaKoto/axt-arcane-bundler") - End ====`;

export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

export async function mergeTypeScriptSources(
  fetchVersion: string,
  packagePaths: string[],
  selectedExports: string[],
  specifier: string,
  exportsByPath: Map<string, string[]>,
  language: OutputLanguage = "typescript",
): Promise<string> {
  const parts: string[] = [
    BANNER,
    "// https://github.com/AXT-Studio/Arcane / https://github.com/AXT-AyaKoto/axt-arcane-bundler",
    `// Package: ${specifier} (ver:${fetchVersion}) / exports: ${selectedExports.join(", ")}`,
    "",
  ];

  const sources = new Map<string, string>();
  for (const pkgPath of packagePaths) {
    sources.set(pkgPath, await fetchPackageSource(fetchVersion, pkgPath));
  }

  const namesByPath = resolveExportsToExtract(
    sources,
    selectedExports,
    exportsByPath,
  );

  for (const pkgPath of packagePaths) {
    const namesToExtract = namesByPath.get(pkgPath);
    if (!namesToExtract || namesToExtract.size === 0) continue;

    const source = sources.get(pkgPath);
    if (source == null) continue;
    const fileName = pkgPath.replace(/^\//, "").split("/").pop() ?? "module.ts";
    let chunk = extractFromSource(source, fileName, namesToExtract, {
      omitTypeOnly: language === "javascript",
    });
    if (language === "javascript") chunk = stripTypes(chunk);
    if (chunk.length > 0) {
      parts.push(chunk, "");
    }
  }

  parts.push(BANNER_END);

  const merged = parts.join("\n").trimEnd() + "\n";
  return normalizeBlankLines(merged);
}
