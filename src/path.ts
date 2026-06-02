/** Normalize mod.ts paths (`./src/Foo.ts`) to graph paths (`/src/Foo.ts`). */
export function normalizePackagePath(modulePath: string): string {
  const stripped = modulePath.replace(/^\.\//, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}
