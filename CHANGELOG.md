# Changelog

Each version matches the Foundry VTT version its types describe. See the README
for how the numbering works.

## 14.365.2

Three more corrections, each verified against the Foundry 14.365 source.

- `ActiveEffect`'s `system` field was untyped. Foundry v14 moved effect changes
  out of the document schema and into `ActiveEffectTypeDataModel`, which pf2e's
  definitions do not describe, so `system` was a bare object and
  `system.changes` could not be read. (`0011`)
- A window header control only allowed a boolean for `visible` and had no
  `onClick`. Foundry defines it as a context menu entry with extra fields, so it
  accepts both. (`0013`)
- `DocumentCloneContext` was missing `addSource`. (`0014`)

## 14.365.1

Corrections to pf2e's definitions, each verified against the Foundry 14.365
source and kept as a separate file under `patches`.

- `BasePlaceableHUD` was missing `activePalette` and `togglePalette`. (`0001`)
- `Sidebar.TABS` was declared on instances rather than statically, so reading
  `CONFIG.ui.sidebar.TABS` fell through to the unrelated `TABS` on
  `ApplicationV2`. `SidebarTabDescriptor` was also missing `documentName` and
  `gmOnly`, and treated `tooltip` and `icon` as required. (`0002`)
- `DrawingDocument` was missing `name`. (`0003`)
- `AmbientLightDocument` was missing `name`. (`0004`)
- `AmbientSoundDocument` was missing `name`, `elevation` and `effects`. (`0005`)
- `TileDocument` was missing `name` and `elevation`, and its `occlusion` still
  described the older `mode` and `radius` fields instead of the current `modes`
  set. (`0006`)
- `LightData` was missing `negative` and `priority`. (`0007`)
- `CONFIG.Canvas` was missing `darknessAnimations`, `CONFIG` was missing
  `soundEffects`, and `CONFIG.Folder` was missing `sidebarIcon`. (`0008`)
- `SceneControls#controls` allowed `undefined` values, which made
  `Object.values(...)` awkward to use. Foundry declares it as
  `Record<string, SceneControl>`. (`0009`)
- `Token#_drawOverlay` accepted only `number | null` for its tint, but Foundry
  passes an `ActiveEffect`'s `tint`, which is a `Color`. (`0010`)
- An effect change was missing `key`, the attribute path it modifies. (`0011`)

## 14.365.0

First release. Synced from pf2e `v14-dev` at commit `d895642a67c`.
