# DFreds Foundry Types

TypeScript type definitions for Foundry VTT, published as an npm package so a
module can depend on them instead of keeping its own copy.

The definitions come from the [pf2e system for Foundry
VTT](https://github.com/foundryvtt/pf2e), which maintains them by hand. This
package copies them, versions them against Foundry, and publishes them. It adds
no types of its own.

## Installing

```sh
npm install --save-dev @dfreds/foundry-types
```

## Versions

The version number is the Foundry version. `14.365.0` describes Foundry v14
build 365. The third number is only for corrections to the types themselves —
`14.365.1` still describes Foundry 14.365, it just fixes something that was
wrong.

| You want                                | Use         |
| --------------------------------------- | ----------- |
| Any Foundry 14 build, always the newest | `^14.365.0` |
| Foundry 14.365 specifically             | `~14.365.0` |

Because the version is tied to Foundry, a new Foundry build produces a new
minor version, and `^14.365.0` will pick it up. If you need to stay on one
build, use `~`.

## Setting up your module

Two things are needed: a path alias so `@client/...` and `@common/...` imports
resolve, and one file that brings in the global names like `game` and `Hooks`.

In `tsconfig.json`:

```jsonc
{
    "compilerOptions": {
        "paths": {
            "@common/*": ["./node_modules/@dfreds/foundry-types/common/*"],
            "@client/*": ["./node_modules/@dfreds/foundry-types/client/*"],
        },
    },
}
```

Then add this at the very top of your module's entry point, above the imports:

```ts
// Keep or else Foundry globals like game and Hooks will not resolve
/// <reference types="@dfreds/foundry-types" />
```

That is what makes `game`, `Hooks`, `CONST`, `Actor`, `PIXI` and the rest
available without importing them. Only comments may appear above it, and the
file must be covered by your `tsconfig.json` `include`.

It can live in any file in your project rather than the entry point — a
dedicated `src/foundry.d.ts` works too. Wherever it goes, that file has to stay
in the program, or the global names disappear everywhere at once.

If you use Vite with `resolve: { tsconfigPaths: true }`, no build config change
is needed — it reads the aliases above.

## Releasing a new version

### One-time setup

The type definitions are copied from a local clone of the pf2e repository, so
you need one:

```sh
git clone git@github.com:foundryvtt/pf2e.git
```

Then copy `type-source.example.json` to `type-source.json` and point it at that
clone:

```json
{
    "pf2eRepoPath": "C:\\src\\foundry-modules\\pf2e",
    "pf2eBranch": "v14-dev"
}
```

Backslashes must be doubled, as shown.

`type-source.json` holds paths specific to your machine, so it is not committed.

### Every release

**1. Bring in the latest definitions.**

```sh
npm run sync
```

This pulls the latest pf2e, copies the definitions in, applies anything in
`patches`, refreshes the dependency list, sets the version in `package.json`,
and adds a `CHANGELOG.md` entry. It does not commit or publish anything.

The version comes from the Foundry version pf2e says it has verified. When
Foundry has moved ahead of pf2e, name the version yourself:

```sh
npm run sync -- --foundry 14.366
```

Syncing twice against the same Foundry version bumps the last number instead
— `14.365.0` becomes `14.365.1` — which is what you want when correcting the
types rather than following a new Foundry build.

**2. Check it.**

```sh
npm install
npm run check
```

`npm run check` type-checks every definition on its own, with `skipLibCheck`
turned off. Nothing should be published if this fails.

**3. Review and commit.** Read through `git status` and the `CHANGELOG.md`
entry. The version in `package.json` is what gets published, so make sure it is
right before going further.

```sh
git add -A
git commit -m "Sync types for Foundry 14.366"
git push
```

**4. Tag it, which publishes it.**

```sh
git tag v14.366.0
git push --tags
```

The tag must be the version in `package.json` with a `v` in front. Pushing it
starts the Publish workflow, which checks the tag against `package.json`, lints,
runs `npm run check` again, and publishes to npm.

There is no npm token anywhere. GitHub Actions is registered with npm as a
trusted publisher for this repository, so the workflow proves who it is and npm
records where the package was built. Publishing only works from that workflow —
it will not work from a laptop, and it will not work from a different workflow
file.

### If something goes wrong

- **The workflow fails saying the tag does not match.** The tag and
  `package.json` disagree. Delete the tag (`git tag -d v14.366.0` and
  `git push --delete origin v14.366.0`), fix the version, and tag again.
- **The workflow fails saying the version already exists.** That version is
  already on npm and cannot be replaced. Sync again to get a new version number
  and release that instead.
- **`npm run sync` stops on a patch.** See "Fixing a type" below.

## Fixing a type

Foundry sometimes releases ahead of pf2e, so a definition here can be wrong or
missing for a while. There are two ways to deal with that, depending on who
needs the fix.

### Fix it for one module

Add the correction to a `.d.ts` file inside that module. TypeScript merges what
you write there with what this package provides, so you can fill in a missing
property or narrow a type without changing anything here.

Use this when only one module cares.

### Fix it for every module

Add a `.patch` file to the `patches` folder in this repository.

When these types lived inside each module, you could edit them in place. That is
no longer possible — they now live in `node_modules`, where any edit is erased
by the next `npm install` and never reaches your other modules. The `patches`
folder replaces that. `npm run sync` copies the definitions from pf2e and then
applies every patch on top, so the correction becomes part of the published
package and every module picks it up. You write the fix once instead of
seventeen times.

To create one, edit the copied files and save the difference:

```sh
git diff -- client common global-external.d.mts util.d.mts > patches/0001-short-description.patch
```

Patches are applied in filename order, so number them.

They also clean up after themselves. Once pf2e corrects the same thing, the
patch no longer fits the file it was written against, and `npm run sync` stops
with an error naming it. That error means the patch has done its job and should
be deleted — so old patches cannot pile up unnoticed.

### Best of all, fix it in pf2e

Both options above are stopgaps. Contributing the correction to
[pf2e](https://github.com/foundryvtt/pf2e) means it arrives on the next sync and
no patch is needed at all.

The `patches` folder may well stay empty. It exists so that a wrong type is
never something you have to wait on someone else to fix.

## License

Apache-2.0. The type definitions are the work of the pf2e system developers —
see `NOTICE` for attribution and a list of what was changed.
