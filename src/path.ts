/** Normalize mod.ts paths (`./src/Foo.ts`) to graph paths (`/src/Foo.ts`). */
export function normalizePackagePath(modulePath: string): string {
  const stripped = modulePath.replace(/^\.\//, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/** Resolve `./Foo.ts` from `/src/Bar.ts` to `/src/Foo.ts`. */
export function resolveRelativePath(fromPath: string, specifier: string): string {
  const baseDir = fromPath.replace(/\/[^/]+$/, "") || "";
  return new URL(specifier, `https://x${baseDir}/`).pathname;
}
