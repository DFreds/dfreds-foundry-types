# Patches

Every `.patch` file here is applied by `npm run sync` after the type definitions
are copied from pf2e, and is published as part of the package. Use one when a
definition is wrong or missing and every module needs the fix.

See "Fixing a type" in the main README for when to use a patch, when to fix it
in a single module instead, and how patches retire themselves.

Create or update one by editing the copied files, then:

```sh
npm run make-patch -- 0017-short-description client/config.d.mts [more files...]
```

This compares the files against the pf2e clone in `type-source.json`, not against
git, so it also works after the files are committed. Patches are applied in
filename order, so number them.
