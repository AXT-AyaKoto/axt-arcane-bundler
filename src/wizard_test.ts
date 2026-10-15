import { test } from "node:test";
import { deepStrictEqual, equal, ok } from "node:assert/strict";
import { render } from "@inquirer/testing";
import { runPrompts } from "./wizard.ts";
import { runWizard } from "./main.ts";

const meta = {
  scope: "ayaexptech", name: "arcane", latest: "1.0.0",
  versions: { "1.0.0": {}, "2.0.0-beta.1": {} },
};

async function waitFor(check: () => boolean): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Prompt did not reach expected state");
}

test("search selects a prerelease, then exports and JavaScript output", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  // The mod.ts endpoint returns source text rather than metadata.
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return String(url).endsWith("/meta.json") ? Response.json(meta) :
      new Response('export { Alpha, Beta } from "./src/alpha.ts";');
  };
  try {
    const prompt = await render((_config: object, context) => {
      Object.defineProperty(context!.output!, "end", { value: () => context!.output });
      return runPrompts(context);
    }, {});
    await waitFor(() => prompt.getScreen().includes("Latest stable"));
    prompt.events.type("beta");
    await waitFor(() => prompt.getScreen().includes("2.0.0-beta.1") && !prompt.getScreen().includes("Latest stable"));
    prompt.events.keypress("enter");
    await waitFor(() => prompt.getScreen().includes("imports:"));
    prompt.events.keypress("space");
    prompt.events.keypress("enter");
    await waitFor(() => prompt.getScreen().includes("output:"));
    prompt.events.keypress("down");
    prompt.events.keypress("enter");
    const selection = await prompt.answer;
    equal(selection.resolved.fetchVersion, "2.0.0-beta.1");
    equal(selection.resolved.specifier, "jsr:@ayaexptech/arcane@2.0.0-beta.1");
    deepStrictEqual(selection.selectedExports, ["Alpha"]);
    equal(selection.outputFormat, "javascript");
    ok(urls.some((url) => url.endsWith("/2.0.0-beta.1/mod.ts")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("empty export selection exits before output prompt or bundling requests", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    if (String(url).endsWith("/meta.json")) return Response.json(meta);
    if (String(url).endsWith("/mod.ts")) return new Response('export { Alpha } from "./src/alpha.ts";');
    throw new Error("Unexpected source request");
  };
  try {
    const prompt = await render((_config: object, context) => {
      Object.defineProperty(context!.output!, "end", { value: () => context!.output });
      return runWizard(context);
    }, {});
    await waitFor(() => prompt.getScreen().includes("Latest stable"));
    prompt.events.keypress("enter");
    await waitFor(() => prompt.getScreen().includes("imports:"));
    prompt.events.keypress("enter");
    await prompt.answer;
    equal(urls.length, 2);
    ok(!prompt.getScreen().includes("output:"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
