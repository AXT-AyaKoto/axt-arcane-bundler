import {
  extractFromSource,
  fetchPackageSource,
  resolveExportsToExtract,
} from "./extract.ts";

export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

export async function mergeTypeScriptSources(
  fetchVersion: string,
  packagePaths: string[],
  selectedExports: string[],
  specifier: string,
  exportsByPath: Map<string, string[]>,
): Promise<string> {
  const parts: string[] = [
    "// ======== Copied from AyaExpTech Arcane ========",
    `// Using: AXT-AyaKoto/axt-arcane-bundler (https://github.com/AXT-AyaKoto/axt-arcane-bundler)`,
    `// Package: ${specifier}`,
    `// Resolved version (sources): ${fetchVersion}`,
    `// Selected exports: ${selectedExports.join(", ")}`,
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
    const chunk = extractFromSource(source, fileName, namesToExtract);
    if (chunk.length > 0) {
      parts.push(chunk, "");
    }
  }

  parts.push("// ======== Copied from AyaExpTech Arcane (End) ========");

  const merged = parts.join("\n").trimEnd() + "\n";
  return normalizeBlankLines(merged);
}
