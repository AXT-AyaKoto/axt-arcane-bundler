import { test } from "node:test";
import { equal } from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyToClipboard } from "./clipboard.ts";

test("Linux clipboard utilities receive UTF-8 text and fall back after a failed command", {
  skip: process.platform !== "linux",
}, async () => {
  const dir = await mkdtemp(join(tmpdir(), "arcane-clipboard-"));
  const originalPath = process.env.PATH;
  const text = "日本語のソース\n".repeat(20_000);
  try {
    await writeFile(join(dir, "wl-copy"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await writeFile(join(dir, "xclip"), `#!/bin/sh\n[ "$1" = "-selection" ] && [ "$2" = "clipboard" ] || exit 2\n/bin/cat > '${dir}/copied'\n`, { mode: 0o755 });
    process.env.PATH = dir;
    await copyToClipboard(text);
    equal(await readFile(join(dir, "copied"), "utf8"), text);
    // A missing command must also fall through to the next utility.
    await rm(join(dir, "wl-copy"));
    await rm(join(dir, "xclip"));
    await writeFile(join(dir, "xsel"), `#!/bin/sh\n[ "$1" = "--clipboard" ] && [ "$2" = "--input" ] || exit 2\n/bin/cat > '${dir}/copied'\n`, { mode: 0o755 });
    await copyToClipboard("second copy");
    equal(await readFile(join(dir, "copied"), "utf8"), "second copy");
  } finally {
    process.env.PATH = originalPath;
    await rm(dir, { recursive: true, force: true });
  }
});
