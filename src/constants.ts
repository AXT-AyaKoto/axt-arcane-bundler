export const ARCANE_SCOPE = "ayaexptech";
export const ARCANE_NAME = "arcane";
export const ARCANE_PACKAGE = `@${ARCANE_SCOPE}/${ARCANE_NAME}`;

export const JSR_META_URL =
  `https://jsr.io/@${ARCANE_SCOPE}/${ARCANE_NAME}/meta.json`;

export function jsrModUrl(version: string): string {
  return `https://jsr.io/@${ARCANE_SCOPE}/${ARCANE_NAME}/${version}/mod.ts`;
}

export function jsrFileUrl(version: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `https://jsr.io/@${ARCANE_SCOPE}/${ARCANE_NAME}/${version}${normalized}`;
}

export function arcaneSpecifier(versionInput: string | undefined): string {
  if (versionInput) {
    return `jsr:${ARCANE_PACKAGE}@${versionInput}`;
  }
  return `jsr:${ARCANE_PACKAGE}`;
}

/** Fallback export names when mod.ts cannot be fetched (offline / dev). */
export const FALLBACK_EXPORTS = [
  "BinaryHeap",
  "BinaryHeapLite",
  "BinarySearch",
  "Deque",
  "DisjointSet",
  "ExtendedMath",
  "Iteration",
  "LazySegmentTree",
  "LinearSieve",
  "MaxFlow",
  "ModOps",
  "SegmentTree",
  "StringOperations",
  "Treap",
  "UniqueID",
  "Vector2D",
] as const;
