# Patches

Every `.patch` file here is applied by `npm run sync` after the type definitions
are copied from pf2e, and is published as part of the package. Use one when a
definition is wrong or missing and every module needs the fix.

See "Fixing a type" in the main README for when to use a patch, when to fix it
in a single module instead, and how patches retire themselves.

Create one by editing the copied files, then:

```sh
git diff -- client common global-external.d.mts util.d.mts > patches/0001-short-description.patch
```

Patches are applied in filename order, so number them.
