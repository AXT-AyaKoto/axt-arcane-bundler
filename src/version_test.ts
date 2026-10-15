import { test } from "node:test";
import { deepStrictEqual, equal, throws } from "node:assert/strict";
import { defaultFetchVersion, resolveArcane, versionChoices, type JsrPackageMeta } from "./version.ts";

const meta: JsrPackageMeta = {
    scope: "ayaexptech",
    name: "arcane",
    latest: "1.0.0",
    versions: Object.fromEntries(
        ["1.0.0-alpha.2", "1.0.0-alpha.10", "1.0.0", "2.0.0-beta.1", "0.9.0"].map((v) => [
            v,
            { createdAt: "2026-01-01" },
        ]),
    ),
};

test("version choices include prereleases in SemVer order and default to latest stable", () => {
    deepStrictEqual(
        versionChoices(meta).map((c) => c.value),
        ["", "2.0.0-beta.1", "1.0.0", "1.0.0-alpha.10", "1.0.0-alpha.2", "0.9.0"],
    );
    equal(defaultFetchVersion(meta), "1.0.0");
    equal(resolveArcane(meta, undefined).specifier, "jsr:@ayaexptech/arcane");
    equal(resolveArcane(meta, "1.0.0-alpha.10").specifier, "jsr:@ayaexptech/arcane@1.0.0-alpha.10");
});

test("with no stable release, newest published prerelease is selected first", () => {
    const prereleases = { ...meta, latest: null };
    equal(defaultFetchVersion(prereleases), "2.0.0-beta.1");
    equal(versionChoices(prereleases)[0].value, "2.0.0-beta.1");
});

test("missing and unknown versions produce errors", () => {
    throws(() => versionChoices({ ...meta, latest: null, versions: {} }), /No published versions/);
    throws(() => resolveArcane(meta, "9.9.9"), /does not exist/);
});
