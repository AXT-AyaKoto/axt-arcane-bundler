import { compare, valid } from "semver";
import {
  arcaneSpecifier,
  ARCANE_PACKAGE,
  JSR_META_URL,
} from "./constants.ts";
import { UserError } from "./errors.ts";

export interface JsrPackageMeta {
  scope: string;
  name: string;
  latest: string | null;
  versions: Record<string, { createdAt: string }>;
}

export interface ResolvedArcane {
  /** Specifier used in generated entry (`jsr:@ayaexptech/arcane` or with `@version`). */
  specifier: string;
  /** Concrete version for JSR HTTP fetches and export listing. */
  fetchVersion: string;
  versionInput: string | undefined;
}

export async function fetchPackageMeta(): Promise<JsrPackageMeta> {
  const response = await fetch(JSR_META_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch package metadata from JSR (${response.status}).`,
    );
  }
  return (await response.json()) as JsrPackageMeta;
}

export function maxPublishedVersion(
  versions: Record<string, unknown>,
): string {
  const keys = Object.keys(versions);
  if (keys.length === 0) {
    throw new Error("No published versions found for AyaExpTech Arcane on JSR.");
  }
  return keys.reduce((best, current) => {
    if (!valid(best)) return current;
    if (!valid(current)) return best;
    return compare(current, best) > 0 ? current : best;
  });
}

export function defaultFetchVersion(meta: JsrPackageMeta): string {
  if (meta.latest) return meta.latest;
  return maxPublishedVersion(meta.versions);
}

export function validateVersionExists(
  meta: JsrPackageMeta,
  version: string,
): void {
  if (!(version in meta.versions)) {
    throw new UserError(
      `Version "${version}" does not exist for ${ARCANE_PACKAGE} on JSR.\n` +
        `Published versions: ${Object.keys(meta.versions).sort().join(", ")}`,
    );
  }
}

export function resolveArcane(
  meta: JsrPackageMeta,
  versionInput: string | undefined,
): ResolvedArcane {
  const trimmed = versionInput?.trim();
  const input = trimmed === "" ? undefined : trimmed;

  if (input) {
    validateVersionExists(meta, input);
    return {
      specifier: arcaneSpecifier(input),
      fetchVersion: input,
      versionInput: input,
    };
  }

  return {
    specifier: arcaneSpecifier(undefined),
    fetchVersion: defaultFetchVersion(meta),
    versionInput: undefined,
  };
}

export function versionHint(meta: JsrPackageMeta): string {
  const v = defaultFetchVersion(meta);
  if (meta.latest) {
    return `(empty = latest stable ${meta.latest})`;
  }
  return `(empty = ${v}; no stable release on JSR yet)`;
}
