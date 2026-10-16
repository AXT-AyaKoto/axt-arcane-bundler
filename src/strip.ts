import { transform } from "sucrase";

export type OutputLanguage = "typescript" | "javascript";

/** Remove TypeScript type syntax only; other syntax is left as written. */
export function stripTypes(code: string): string {
  const { code: stripped } = transform(code, {
    transforms: ["typescript"],
    disableESTransforms: true,
  });
  // Sucrase keeps line positions, leaving whitespace where types were removed.
  return stripped.replace(/[ \t]+$/gm, "").trim();
}
