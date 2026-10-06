# Recorded duvet drop

`single.ts` and `queen.ts` contain XYZ Float32 proxy samples relative to the bed-derived release origin,
embedded as base64. Playback adds the current release origin (including XZ bed placement) before updating the render mesh. Each clip contains 1,914 vertices and 61 frames at 60 Hz
(the current one-second drop). No simulation is run to create these at page
load or during the application build.

Initial display and duvet color changes play these samples over two seconds at 0.5x source time, interpolating every render frame (120 intervals at 60 FPS). The recorded samples are unchanged.
Pillow selection and pad impulses switch to the live solver at the current
pose, retaining the preceding sample for Verlet velocity. Mesh deformation
and render normals are still computed at runtime.

Explicit authoring commands from the project root:

```sh
node tooling/bake-duvet.mjs
node tooling/bake-duvet.mjs --check
```

The tool reproduces BedScene placement and uses the current GLBs, binding,
collision proxies and live solver. Keep its placement code synchronized with
BedScene when changing layout. Regenerate both clips after changing models,
collision geometry, placement or solver settings. `--check` compares the full
recording byte-for-byte and checks interpolation and switching to live motion.
The GLB reader supports the current non-skinned exported meshes, not arbitrary
future GLB hierarchies or compression.

