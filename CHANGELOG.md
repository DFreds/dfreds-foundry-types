# Changelog

Each version matches the Foundry VTT version its types describe. See the README
for how the numbering works.

## 14.369.0

Synced from pf2e `v14-dev` at commit `3d99a25c991`, moving to Foundry 14.369.

- pf2e now types `BasePlaceableHUD#activePalette`, so `0001` only adds
  `togglePalette`.
- pf2e rewrote the `ActiveEffect` types. `EffectChangeData` now follows
  Foundry's own definition, where `key` is optional. `0011` now only types
  `ActiveEffect#system`, where `key` is required.
- pf2e now types `Canvas#level`, so `0015` only adds `Level#elevation.base`. It
  is renamed to `0015-level-elevation-base.patch`.

## 14.366.1

Synced from pf2e `v14-dev` at commit `64c0e3ae6b8`.

- `Tile`, `Note`, `AmbientSound`, `AmbientLight`, `Drawing` and `Wall` were
  missing `levels`. (`0003`-`0006`, `0016`)
- `Note` and `Drawing` were missing `elevation`. (`0003`, `0016`)

## 14.366.0

Synced from pf2e `v14-dev` at commit `54e70a5288c`, moving to Foundry 14.366.

- `Canvas` was missing `level`, and `Level#elevation` was missing `base`. (`0015`)

## 14.365.2

- `ActiveEffect#system` was untyped, so `system.changes` could not be read.
  (`0011`)
- A window header control was missing `onClick` and allowed only a boolean for
  `visible`. (`0013`)
- `DocumentCloneContext` was missing `addSource`. (`0014`)

## 14.365.1

- `BasePlaceableHUD` was missing `activePalette` and `togglePalette`. (`0001`)
- `Sidebar.TABS` was declared on instances rather than statically, and
  `SidebarTabDescriptor` was missing `documentName` and `gmOnly` and required
  `tooltip` and `icon`. (`0002`)
- `DrawingDocument` was missing `name`. (`0003`)
- `AmbientLightDocument` was missing `name`. (`0004`)
- `AmbientSoundDocument` was missing `name`, `elevation` and `effects`. (`0005`)
- `TileDocument` was missing `name` and `elevation`, and its `occlusion`
  described `mode` and `radius` instead of `modes`. (`0006`)
- `LightData` was missing `negative` and `priority`. (`0007`)
- `CONFIG.Canvas` was missing `darknessAnimations`, `CONFIG` was missing
  `soundEffects`, and `CONFIG.Folder` was missing `sidebarIcon`. (`0008`)
- `SceneControls#controls` allowed `undefined` values instead of
  `Record<string, SceneControl>`. (`0009`)
- `Token#_drawOverlay` took `number | null` for its tint rather than `Color`.
  (`0010`)
- An effect change was missing `key`. (`0011`)

## 14.365.0

First release. Synced from pf2e `v14-dev` at commit `d895642a67c`.
