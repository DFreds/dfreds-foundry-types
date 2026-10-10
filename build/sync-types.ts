import { execFileSync } from "child_process";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import { packageRoot, readTypeSource } from "./type-source.ts";

const SYNCED_ENTRIES = ["client", "common", "global-external.d.mts", "util.d.mts"];

const PEER_DEPENDENCIES = ["typescript"];

const DEPS_FROM_PF2E_ROOT = [
    "@pixi/graphics-smooth",
    "@pixi/particle-emitter",
    "@types/simple-peer",
    "gsap",
    "handlebars",
    "js-angusj-clipper",
];

const { pf2eRepoPath, pf2eBranch } = readTypeSource();

const pf2eTypesPath = path.resolve(pf2eRepoPath, "types", "foundry");
if (!fs.lstatSync(pf2eTypesPath, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`No folder found at ${pf2eTypesPath}`);
    process.exit(1);
}

function git(...args: string[]): string {
    return execFileSync("git", ["-C", pf2eRepoPath, ...args], {
        encoding: "utf-8",
    }).trim();
}

function assertCleanPf2eCheckout(): void {
    if (git("status", "--porcelain", "--", "types/foundry")) {
        console.error(`${pf2eRepoPath} has uncommitted changes under types/foundry. Commit or stash them first.`);
        process.exit(1);
    }
}

function changedSyncedEntries(): string {
    return execFileSync("git", ["status", "--porcelain", "--", ...SYNCED_ENTRIES], {
        cwd: packageRoot,
        encoding: "utf-8",
    }).trim();
}

function assertCleanPackage(): void {
    if (changedSyncedEntries()) {
        console.error(
            `${packageRoot} has uncommitted changes in ${SYNCED_ENTRIES.join(", ")}, which sync would delete. Commit them, or save them with \`git stash -u -- ${SYNCED_ENTRIES.join(" ")}\`.`,
        );
        process.exit(1);
    }
}

function updatePf2e(): void {
    console.log(`Updating ${pf2eRepoPath} to ${pf2eBranch}...`);
    git("checkout", pf2eBranch);
    git("pull");
}

function copyTypes(): void {
    for (const entry of SYNCED_ENTRIES) {
        const target = path.resolve(packageRoot, entry);
        fsExtra.removeSync(target);
        fsExtra.copySync(path.resolve(pf2eTypesPath, entry), target);
    }
    console.log(`Copied ${SYNCED_ENTRIES.join(", ")} from ${pf2eTypesPath}`);
}

function applyPatches(): void {
    const patchDir = path.resolve(packageRoot, "patches");
    const patches = fs
        .readdirSync(patchDir)
        .filter((file) => file.endsWith(".patch"))
        .sort();

    if (patches.length === 0) {
        console.log("No patches to apply");
        return;
    }

    for (const patch of patches) {
        try {
            execFileSync("git", ["apply", "--verbose", path.resolve(patchDir, patch)], {
                cwd: packageRoot,
                stdio: "inherit",
            });
            console.log(`Applied ${patch}`);
        } catch {
            console.error(`Failed to apply patches/${patch}. If pf2e has fixed this upstream, delete the patch.`);
            process.exit(1);
        }
    }
}

function syncDependencies(pkg: Record<string, unknown>): void {
    const pf2eTypesPkg = JSON.parse(fs.readFileSync(path.resolve(pf2eTypesPath, "package.json"), "utf-8")) as {
        devDependencies?: Record<string, string>;
    };

    const pf2eRootPkg = JSON.parse(fs.readFileSync(path.resolve(pf2eRepoPath, "package.json"), "utf-8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    const pf2eRootDeps = { ...pf2eRootPkg.dependencies, ...pf2eRootPkg.devDependencies };

    const depsFromPf2eRoot = DEPS_FROM_PF2E_ROOT.map((name) => {
        const version = pf2eRootDeps[name];
        if (!version) {
            console.error(`${name} is no longer in pf2e's package.json. Update DEPS_FROM_PF2E_ROOT.`);
            process.exit(1);
        }
        return [name, version] as const;
    });

    const dependencies = Object.fromEntries(
        [...Object.entries(pf2eTypesPkg.devDependencies ?? {}), ...depsFromPf2eRoot]
            .filter(([name]) => !PEER_DEPENDENCIES.includes(name))
            .sort(([a], [b]) => a.localeCompare(b)),
    );

    pkg.dependencies = dependencies;
    console.log(`Synced ${Object.keys(dependencies).length} dependencies from pf2e`);
}

function resolveVersion(currentVersion: string): string {
    const override = readFoundryArg();
    const foundryVersion = override ?? readVerifiedCompatibility();

    if (!/^\d+\.\d+$/.test(foundryVersion)) {
        console.error(`Expected a Foundry version like "14.365", got "${foundryVersion}"`);
        process.exit(1);
    }

    const [currentMajor, currentBuild, currentPatch] = currentVersion.split(".").map(Number);
    const [major, build] = foundryVersion.split(".").map(Number);
    const isOlder = major < currentMajor || (major === currentMajor && build < currentBuild);

    if (isOlder) {
        console.error(
            `Foundry ${foundryVersion} is older than the current version ${currentVersion}. Pass --foundry ${currentMajor}.${currentBuild} to stay on it.`,
        );
        process.exit(1);
    }

    if (major === currentMajor && build === currentBuild) {
        return `${foundryVersion}.${currentPatch + 1}`;
    }
    return `${foundryVersion}.0`;
}

function readFoundryArg(): string | undefined {
    const index = process.argv.indexOf("--foundry");
    return index === -1 ? undefined : (process.argv[index + 1] ?? "");
}

function readVerifiedCompatibility(): string {
    const systemPath = path.resolve(pf2eRepoPath, "system.pf2e.json");
    const system = JSON.parse(fs.readFileSync(systemPath, "utf-8")) as {
        compatibility?: { verified?: string };
    };

    const verified = system.compatibility?.verified;
    if (!verified) {
        console.error(`No compatibility.verified found in ${systemPath}`);
        process.exit(1);
    }
    return verified;
}

function writeChangelogEntry(version: string, commit: string): void {
    const changelogPath = path.resolve(packageRoot, "CHANGELOG.md");
    const existing = fs.readFileSync(changelogPath, "utf-8");
    const entry = [`## ${version}`, "", `Synced from pf2e \`${pf2eBranch}\` at commit \`${commit}\`.`, "", ""].join(
        "\n",
    );

    const newestEntry = existing.indexOf("\n## ");
    const insertAt = newestEntry === -1 ? existing.length : newestEntry + 1;

    fs.writeFileSync(changelogPath, existing.slice(0, insertAt) + entry + existing.slice(insertAt), "utf-8");
}

function describeChanges(
    pkg: Record<string, unknown>,
    previousDependencies: unknown,
    foundryVersion: string,
): string[] {
    const reasons: string[] = [];

    const touched = changedSyncedEntries();
    if (touched) {
        const count = touched.split("\n").length;
        reasons.push(`${count} type ${count === 1 ? "file" : "files"} changed`);
    }

    if (JSON.stringify(pkg.dependencies) !== JSON.stringify(previousDependencies)) {
        reasons.push("dependencies changed");
    }

    if (pkg.foundryVersion !== foundryVersion) {
        reasons.push(`Foundry version moved to ${foundryVersion}`);
    }

    return reasons;
}

assertCleanPackage();
assertCleanPf2eCheckout();
updatePf2e();

const commit = git("rev-parse", "--short", "HEAD");
console.log(`pf2e is at ${commit} on ${pf2eBranch}`);

copyTypes();
applyPatches();

const packageJsonPath = path.resolve(packageRoot, "package.json");
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as Record<string, unknown>;
const previousDependencies = pkg.dependencies;
const previousVersion = pkg.version as string;

syncDependencies(pkg);

const version = resolveVersion(previousVersion);
const foundryVersion = version.split(".").slice(0, 2).join(".");
const reasons = describeChanges(pkg, previousDependencies, foundryVersion);

if (reasons.length === 0) {
    console.log(`\nNothing changed. Still at ${previousVersion} (Foundry ${pkg.foundryVersion}).`);
    process.exit(0);
}

pkg.version = version;
pkg.foundryVersion = foundryVersion;
pkg.pf2eCommit = commit;

fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 4)}\n`, "utf-8");

writeChangelogEntry(version, commit);

console.log(`\n${reasons.join("; ")}`);
console.log(`Version is now ${version} (Foundry ${foundryVersion}), was ${previousVersion}`);
console.log("Review `git status`, then run `npm install && npm run check`.");
