import { transform } from "sucrase";

export type OutputFormat = "typescript" | "javascript";

export function formatOutput(source: string, format: OutputFormat): string {
    if (format === "typescript") return source;
    return transform(source, {
        transforms: ["typescript"],
        disableESTransforms: true,
    }).code;
}
