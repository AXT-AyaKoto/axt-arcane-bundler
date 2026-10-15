import { readFile, writeFile } from "node:fs/promises";
import { valid } from "semver";

const tag = process.argv[2];
const version = tag?.startsWith("v") ? tag.slice(1) : "";
if (!version || valid(version) !== version) {
  throw new Error(`Expected a tag such as v1.0.0 or v1.0.0-alpha.1; got ${tag}`);
}
const pkg = JSON.parse(await readFile("package.json", "utf8"));
pkg.version = version;
await writeFile("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
// Keep the lockfile's package metadata consistent without resolving dependencies again.
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
lock.version = version;
lock.packages[""].version = version;
await writeFile("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
