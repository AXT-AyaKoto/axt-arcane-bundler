import { chmod } from "node:fs/promises";
import { build } from "esbuild";

await build({
    entryPoints: ["exec.ts"],
    outfile: "dist/cli.js",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22.13",
    banner: {
        // CommonJS dependencies (including TypeScript) access Node built-ins at runtime.
        js: [
            "#!/usr/bin/env node",
            'import { createRequire } from "node:module";',
            'import { fileURLToPath } from "node:url";',
            'import { dirname } from "node:path";',
            "const require = createRequire(import.meta.url);",
            "const __filename = fileURLToPath(import.meta.url);",
            "const __dirname = dirname(__filename);",
        ].join("\n"),
    },
    legalComments: "eof",
});
await chmod("dist/cli.js", 0o755);
