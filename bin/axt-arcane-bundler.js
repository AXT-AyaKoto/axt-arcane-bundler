#!/usr/bin/env node
// Runs src/cli.ts without a build step.
// Bun executes TypeScript natively. Node.js refuses to strip types from files
// under node_modules, so on Node.js this package's .ts files are transpiled
// with the TypeScript compiler (already a runtime dependency) in a load hook.
if (!process.versions.bun) {
  const { registerHooks } = await import("node:module");
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { default: ts } = await import("typescript");

  const srcDir = new URL("../src/", import.meta.url).href;

  registerHooks({
    load(url, context, nextLoad) {
      if (!url.startsWith(srcDir) || !url.endsWith(".ts")) {
        return nextLoad(url, context);
      }
      const fileName = fileURLToPath(url);
      const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
        fileName,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2023,
          verbatimModuleSyntax: true,
        },
      });
      return { format: "module", source: outputText, shortCircuit: true };
    },
  });
}

await import("../src/cli.ts");
