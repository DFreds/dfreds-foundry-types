import { execFileSync } from "child_process";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Directories and files copied verbatim out of `<pf2e>/types/foundry`. */
const SYNCED_ENTRIES = ["client", "common", "global-external.d.mts", "util.d.mts"];

/** pf2e ships these as devDependencies of its types; we ship them as real deps. */
const DEP_EXCLUSIONS = ["typescript"];

/**
 * Packages the type definitions import but that pf2e's `types/foundry/package.json`
 * does not list -- inside pf2e they resolve against the repo root instead. Versions
 * are read from pf2e's root `package.json` so they stay in step with it.
 */
const ADDITIONAL_DEPS = [
    "@pixi/graphics-smooth",
    "@pixi/particle-emitter",
    "@types/simple-peer",
    "handlebars",
    "js-angusj-clipper",
];

/** Where the type definitions are copied from. Local to each checkout, so it is not committed. */
type TypeSource = {
    pf2eRepoPath: string;
    pf2eBranch: string;
};

function readTypeSource(): TypeSource {
    const configPath = path.resolve(packageRoot, "type-source.json");

    if (!fs.existsSync(configPath)) {
        console.error(
            `No type-source.json found at ${configPath}.\nCopy type-source.example.json to type-source.json and point it at your pf2e clone.`,
        );
        process.exit(1);
    }

    let config: Partial<TypeSource>;
    try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Partial<TypeSource>;
    } catch (error) {
        // Windows paths need doubled backslashes in JSON, which is easy to get wrong by hand.
        console.error(
            `${configPath} is not valid JSON: ${(error as Error).message}\nBackslashes in Windows paths must be doubled, as in "C:\\\\src\\\\foundry-modules\\\\pf2e".`,
        );
        process.exit(1);
    }

    const missing = (["pf2eRepoPath", "pf2eBranch"] as const).filter((key) => !config[key]);

    if (missing.length > 0) {
        console.error(`type-source.json is missing: ${missing.join(", ")}. See type-source.example.json.`);
        process.exit(1);
    }

    return config as TypeSource;
}

const { pf2eRepoPath, pf2eBranch } = readTypeSource();

const sourceTypesPath = path.resolve(pf2eRepoPath, "types", "foundry");
if (!fs.lstatSync(sourceTypesPath, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`No folder found at ${sourceTypesPath}`);
    process.exit(1);
}

function git(...args: string[]): string {
    return execFileSync("git", ["-C", pf2eRepoPath, ...args], {
        encoding: "utf-8",
    }).trim();
}

// A dirty pf2e checkout would silently bake local edits into a published package.
function assertCleanCheckout(): void {
    if (git("status", "--porcelain", "--", "types/foundry")) {
        console.error(`${pf2eRepoPath} has uncommitted changes under types/foundry. Commit or stash them first.`);
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
        fsExtra.copySync(path.resolve(sourceTypesPath, entry), target);
    }
    console.log(`Copied ${SYNCED_ENTRIES.join(", ")} from ${sourceTypesPath}`);
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
            // A patch that no longer applies usually means pf2e fixed it upstream.
            console.error(`Failed to apply patches/${patch}. If pf2e has fixed this upstream, delete the patch.`);
            process.exit(1);
        }
    }
}

/** Mirrors the devDependencies pf2e declares for its own types, minus the toolchain. */
function syncDependencies(pkg: Record<string, unknown>): void {
    const sourcePkg = JSON.parse(fs.readFileSync(path.resolve(sourceTypesPath, "package.json"), "utf-8")) as {
        devDependencies?: Record<string, string>;
    };

    const rootPkg = JSON.parse(fs.readFileSync(path.resolve(pf2eRepoPath, "package.json"), "utf-8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    const rootDeps = { ...rootPkg.dependencies, ...rootPkg.devDependencies };

    const additional = ADDITIONAL_DEPS.map((name) => {
        const version = rootDeps[name];
        if (!version) {
            console.error(`${name} is no longer in pf2e's package.json. Update ADDITIONAL_DEPS.`);
            process.exit(1);
        }
        return [name, version] as const;
    });

    const dependencies = Object.fromEntries(
        [...Object.entries(sourcePkg.devDependencies ?? {}), ...additional]
            .filter(([name]) => !DEP_EXCLUSIONS.includes(name))
            .sort(([a], [b]) => a.localeCompare(b)),
    );

    pkg.dependencies = dependencies;
    console.log(`Synced ${Object.keys(dependencies).length} dependencies from pf2e`);
}

/**
 * Package versions are `MAJOR.BUILD.PATCH`, where MAJOR.BUILD is the Foundry
 * version the types describe (14.365 -> 14.365.0). PATCH covers type-only fixes
 * against that same Foundry build. Defaults to pf2e's verified compatibility,
 * which lags the live Foundry release -- pass `--foundry 14.365` to override.
 */
function resolveVersion(currentVersion: string): string {
    const override = readFoundryArg();
    const foundryVersion = override ?? readVerifiedCompatibility();

    if (!/^\d+\.\d+$/.test(foundryVersion)) {
        console.error(`Expected a Foundry version like "14.365", got "${foundryVersion}"`);
        process.exit(1);
    }

    const [currentMajor, currentBuild, currentPatch] = currentVersion.split(".");
    if (`${currentMajor}.${currentBuild}` === foundryVersion) {
        return `${foundryVersion}.${Number(currentPatch) + 1}`;
    }
    return `${foundryVersion}.0`;
}

function readFoundryArg(): string | undefined {
    const index = process.argv.indexOf("--foundry");
    return index === -1 ? undefined : process.argv[index + 1];
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

    // Newest entry goes above the previous one, below the preamble.
    const firstEntry = existing.indexOf("\n## ");
    const insertAt = firstEntry === -1 ? existing.length : firstEntry + 1;

    fs.writeFileSync(changelogPath, existing.slice(0, insertAt) + entry + existing.slice(insertAt), "utf-8");
}

assertCleanCheckout();
updatePf2e();

const commit = git("rev-parse", "--short", "HEAD");
console.log(`pf2e is at ${commit} on ${pf2eBranch}`);

copyTypes();
applyPatches();

const packageJsonPath = path.resolve(packageRoot, "package.json");
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as Record<string, unknown>;

syncDependencies(pkg);

const version = resolveVersion(pkg.version as string);
pkg.version = version;
pkg.foundryVersion = version.split(".").slice(0, 2).join(".");
pkg.pf2eCommit = commit;

fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 4)}\n`, "utf-8");

writeChangelogEntry(version, commit);

console.log(`\nVersion is now ${version} (Foundry ${pkg.foundryVersion})`);
console.log("Review `git status`, then run `npm install && npm run check`.");
