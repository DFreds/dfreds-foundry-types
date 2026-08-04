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

| You want                              | Use          |
| ------------------------------------- | ------------ |
| Any Foundry 14 build, always the newest| `^14.365.0`  |
| Foundry 14.365 specifically            | `~14.365.0`  |

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
            "@client/*": ["./node_modules/@dfreds/foundry-types/client/*"]
        }
    }
}
```

Then add a file at `src/foundry.d.ts` containing one line:

```ts
/// <reference types="@dfreds/foundry-types" />
```

That is what makes `game`, `Hooks`, `CONST`, `Actor`, `PIXI` and the rest
available without importing them. Make sure `src` is covered by your
`tsconfig.json` `include`.

If you use Vite with `resolve: { tsconfigPaths: true }`, no build config change
is needed — it reads the aliases above.

## Updating to a new Foundry version

The type definitions are copied from a local clone of the pf2e repository, so
you need one:

```sh
git clone git@github.com:foundryvtt/pf2e.git
```

Then copy `type-source.example.json` to `type-source.json` and point it at that
clone:

```jsonc
{
    "pf2eRepoPath": "C:\\src\\foundry-modules\\pf2e",
    "pf2eBranch": "v14-dev"
}
```

`type-source.json` holds paths specific to your machine, so it is not committed.

```sh
npm run sync                    # uses the Foundry version pf2e has verified
npm run sync -- --foundry 14.365   # or name the version yourself
```

`npm run sync` pulls the latest pf2e, copies the type definitions in, applies
anything in `patches/`, updates the dependency list, and sets the version. It
does not commit or publish. Review the changes, then:

```sh
npm install
npm run check
```

`npm run check` type-checks the definitions on their own. Publishing happens in
CI when a `v*` tag is pushed.

## Fixing a type

Foundry sometimes ships ahead of pf2e, so a definition may be wrong or missing.
Two options:

- **Fix it for everyone.** Add a `.patch` file to `patches/`. It is applied on
  every sync and published with the package, so every module gets the fix. If a
  later sync reports that a patch no longer applies, pf2e has fixed it upstream
  and the patch should be deleted.
- **Fix it for one module.** Use declaration merging in your own module's
  `src/*.d.ts`. Nothing here needs to change.

The better long-term fix is usually to contribute it to pf2e.

## License

Apache-2.0. The type definitions are the work of the pf2e system developers —
see `NOTICE` for attribution and a list of what was changed.
