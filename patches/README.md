# Patches

Every `.patch` file here is applied by `npm run sync` after the type
definitions are copied from pf2e, and is published as part of the package. Use
one when a definition is wrong or missing and every module needs the fix.

Create one by editing the copied files, then:

```sh
git diff -- client common global-external.d.mts util.d.mts > patches/0001-short-description.patch
```

Patches are applied in filename order, so number them.

If a sync fails because a patch no longer applies, pf2e has almost certainly
fixed that problem upstream. Delete the patch and sync again.

Prefer contributing the fix to [pf2e](https://github.com/foundryvtt/pf2e)
instead — then it arrives on the next sync and the patch can go away.
