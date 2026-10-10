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

const FILES_DIFFER = 1;

function diffAgainstPristine(pristine: string, current: string): string {
    try {
        execFileSync("git", ["diff", "--no-index", "--no-color", "--", pristine, current], { encoding: "utf-8" });
        return "";
    } catch (error) {
        const { status, stdout } = error as { status?: number; stdout?: string };
        if (status !== FILES_DIFFER || !stdout) throw error;
        return stdout;
    }
}

const hunks: string[] = [];
for (const file of files.map((file) => path.posix.normalize(file.replaceAll("\\", "/")))) {
    const diff = diffAgainstPristine(path.resolve(pristineRoot, file), path.resolve(packageRoot, file));

    if (!diff.trim()) {
        console.log(`${file} is unchanged, skipping`);
        continue;
    }

    const lines = diff.split("\n");
    const body = lines.slice(lines.findIndex((line) => line.startsWith("@@"))).join("\n");
    hunks.push([`diff --git a/${file} b/${file}`, `--- a/${file}`, `+++ b/${file}`, body].join("\n"));
}

if (hunks.length === 0) {
    console.error("Nothing to write: no file differed from pf2e");
    process.exit(1);
}

const target = path.resolve(packageRoot, "patches", `${name}.patch`);
fs.writeFileSync(target, hunks.join(""), "utf-8");
console.log(`Wrote patches/${name}.patch covering ${hunks.length} file(s)`);
