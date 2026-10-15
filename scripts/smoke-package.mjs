import { equal, match, ok } from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { runInNewContext } from "node:vm";

// Run against the tarball, outside the checkout, with no installed dependencies.
if (process.platform !== "linux") throw new Error("Package smoke tests require Linux clipboard fixtures.");
if (!process.argv[2]) throw new Error("Usage: node scripts/smoke-package.mjs path/to/package.tgz");
const root = await mkdtemp(join(tmpdir(), "arcane-package-"));
try {
  const unpack = spawnSync("tar", ["-xzf", resolve(process.argv[2]), "-C", root], { encoding: "utf8" });
  equal(unpack.status, 0, unpack.stderr);
  const pkg = JSON.parse(await readFile(join(root, "package/package.json"), "utf8"));
  equal(pkg.type, "module");
  equal(Object.keys(pkg.bin).length, 1);
  equal(Object.keys(pkg.dependencies ?? {}).length, 0);
  const entry = join(root, "package", pkg.bin["axt-arcane-bundler"]);
  match(await readFile(entry, "utf8"), /^#!\/usr\/bin\/env node\n/);
  const commands = join(root, "bin");
  await mkdir(commands);
  await writeFile(join(commands, "wl-copy"), '#!/bin/sh\n/bin/cat > "$ARCANE_CLIPBOARD"\n', { mode: 0o755 });
  const preload = join(root, "fixture.mjs");
  await writeFile(preload, `import { appendFileSync, readFileSync } from "node:fs";
const fixtures = JSON.parse(readFileSync(process.env.ARCANE_FIXTURES, "utf8"));
globalThis.fetch = async (input) => {
  const url = String(input);
  appendFileSync(process.env.ARCANE_REQUESTS, url + "\\n");
  if (!(url in fixtures)) throw new Error("Unexpected request: " + url);
  const value = fixtures[url];
  return new Response(typeof value === "string" ? value : JSON.stringify(value), {
    status: process.env.ARCANE_FAIL_METADATA === "1" ? 503 : 200,
  });
};
`);
  const fixtures = {
    "https://jsr.io/@ayaexptech/arcane/meta.json": {
      latest: "1.0.0", versions: { "1.0.0": {}, "2.0.0-beta.1": {} },
    },
  };
  for (const version of ["1.0.0", "2.0.0-beta.1"]) {
    const base = `https://jsr.io/@ayaexptech/arcane/${version}`;
    fixtures[`${base}/mod.ts`] = 'export { Counter, Unused } from "./src/Counter.ts";';
    fixtures[`${base}_meta.json`] = { moduleGraph2: {
      "/src/Counter.ts": { dependencies: [{ kind: "import", specifier: "./Helper.ts" }] },
      "/src/Helper.ts": {},
    } };
    fixtures[`${base}/src/Counter.ts`] = `import { Helper } from "./Helper.ts";
/** Counter docs. */
export class Counter<T extends number> extends Helper {
  increment(amount: T): number { return this.value += amount; }
}
export class Unused {}
`;
    fixtures[`${base}/src/Helper.ts`] = "/** Helper docs. */\nexport class Helper { value: number = 0; }\n";
  }
  const fixturesPath = join(root, "fixtures.json");
  await writeFile(fixturesPath, JSON.stringify(fixtures));
  const runtimes = [process.env.NODE_BINARY ?? process.execPath, process.env.BUN_BINARY ?? "bun"];
  const results = [];
  for (const runtime of runtimes) {
    for (const scenario of ["typescript", "javascript", "empty", "error"]) {
      const clipboard = join(root, "clipboard.txt");
      const requests = join(root, "requests.txt");
      await rm(clipboard, { force: true });
      await writeFile(requests, "");
      const output = await new Promise((resolveOutput, reject) => {
        const child = spawn(runtime, ["--import", preload, entry], {
          cwd: root,
          env: { ...process.env, TERM: "xterm-256color", NO_COLOR: "1",
            PATH: commands + delimiter + process.env.PATH,
            ARCANE_CLIPBOARD: clipboard, ARCANE_FIXTURES: fixturesPath,
            ARCANE_REQUESTS: requests, ARCANE_FAIL_METADATA: scenario === "error" ? "1" : "0",
          },
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "", stderr = "", stage = 0;
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error(`${runtime}/${scenario} timed out: ${stdout}\n${stderr}`));
        }, 20_000);
        child.on("error", reject);
        child.stderr.on("data", (data) => { stderr += data; });
        child.stdout.on("data", (data) => {
          const screen = stripVTControlCharacters(String(data));
          stdout += screen;
          if (stage === 0 && screen.includes("Latest stable")) {
            if (scenario === "javascript") {
              stage = 1;
              child.stdin.write("beta");
            } else {
              stage = 2;
              child.stdin.write("\r");
            }
          } else if (stage === 1 && screen.includes("2.0.0-beta.1") && !screen.includes("Latest stable")) {
            stage = 2;
            child.stdin.write("\r");
          } else if (stage === 2 && screen.includes("imports:")) {
            stage = 3;
            child.stdin.write(scenario === "empty" ? "\r" : " \r");
          } else if (stage === 3 && screen.includes("output:")) {
            stage = 4;
            child.stdin.write(scenario === "javascript" ? "\x1b[B\r" : "\r");
          }
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          try {
            equal(code, scenario === "error" ? 1 : 0, `${stdout}\n${stderr}`);
            resolveOutput({ stdout, stderr });
          } catch (error) { reject(error); }
        });
      });
      const urls = (await readFile(requests, "utf8")).trim().split("\n");
      if (scenario === "empty" || scenario === "error") {
        await readFile(clipboard).then(() => { throw new Error("Clipboard was changed"); }, (error) => equal(error.code, "ENOENT"));
        equal(urls.length, scenario === "empty" ? 2 : 1);
        if (scenario === "empty") ok(!output.stdout.includes("output:"));
        else match(output.stderr, /503/);
      } else {
        const source = await readFile(clipboard, "utf8").catch((error) => { throw new Error(`${runtime}/${scenario}: ${output.stdout}\n${output.stderr}`, { cause: error }); });
        ok(source.includes("/** Counter docs. */"));
        ok(source.includes("class Helper"));
        ok(!source.includes("class Unused"));
        ok(!source.includes("export class"));
        if (scenario === "typescript") {
          ok(source.includes("amount: T"));
          ok(source.includes("// Package: jsr:@ayaexptech/arcane\n"));
        } else {
          ok(!source.includes("amount: T"));
          ok(source.includes("// Package: jsr:@ayaexptech/arcane@2.0.0-beta.1\n"));
          equal(runInNewContext(`${source}\nnew Counter().increment(7)`), 7);
        }
        results.push({ scenario, source });
      }
      console.log(`Passed: ${runtime} / ${scenario}`);
    }
  }
  for (const scenario of ["typescript", "javascript"]) {
    const sources = results.filter((result) => result.scenario === scenario).map((result) => result.source);
    equal(sources[0], sources[1], `${scenario} output differs between runtimes`);
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
