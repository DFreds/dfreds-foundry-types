/**
 * Regenerate a patch from the working tree.
 *
 * Patches are diffs against the pristine pf2e definitions, not against this
 * repository's history. Using `git diff` produces a truncated patch once the
 * patched files are committed, so the comparison is made against the pf2e clone
 * named in type-source.json.
 *
 * Usage: npm run make-patch -- 0010-token-draw-overlay-tint client/canvas/placeables/token.d.mts [...]
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const [name, ...files] = process.argv.slice(2);
if (!name || files.length === 0) {
    console.error("Usage: npm run make-patch -- <patch-name> <file> [file...]");
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(path.resolve(packageRoot, "type-source.json"), "utf-8")) as {
    pf2eRepoPath: string;
};
const pristineRoot = path.resolve(config.pf2eRepoPath, "types", "foundry");

const hunks: string[] = [];
for (const file of files) {
    const pristine = path.resolve(pristineRoot, file);
    const current = path.resolve(packageRoot, file);

    let diff = "";
    try {
        // diff exits 1 when files differ, which is the expected case.
        execFileSync("diff", ["-u", pristine, current], { encoding: "utf-8" });
    } catch (error) {
        diff = (error as { stdout?: string }).stdout ?? "";
    }

    if (!diff.trim()) {
        console.log(`${file} is unchanged, skipping`);
        continue;
    }

    const body = diff.split("\n").slice(2).join("\n");
    hunks.push([`diff --git a/${file} b/${file}`, `--- a/${file}`, `+++ b/${file}`, body].join("\n"));
}

if (hunks.length === 0) {
    console.error("Nothing to write: no file differed from pf2e");
    process.exit(1);
}

const target = path.resolve(packageRoot, "patches", `${name}.patch`);
fs.writeFileSync(target, hunks.join(""), "utf-8");
console.log(`Wrote patches/${name}.patch covering ${hunks.length} file(s)`);
