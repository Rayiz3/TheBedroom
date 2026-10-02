# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are internal developers working on bedding visualization. They use the tool while developing and checking bedding textures and meshes.

## Product Purpose

The product is an internal 3D preview tool for inspecting bedding textures and meshes. Its central job is to make bedding color and fine surface texture detail easy to evaluate on a furnished bed model.

Success means a developer can load an available textile texture, see it applied to the duvet and pillows, inspect it from different viewing angles, and tune the render enough to judge the material detail.

## Positioning

This is a bedding-specific material inspection workspace rather than a general-purpose 3D viewer. It combines textile texture bundles with a bed, duvet, and pillow assembly so color and surface detail can be judged in the intended product context.

## Operating Context

- Internal development use.
- The main workflow is choosing a bundled textile texture, orbiting the bedroom assembly, changing the camera field of view, and tuning environment and material properties.
- The current interface uses Korean for user-facing controls, with established English rendering terms included where useful.

## Capabilities and Constraints

- Preview a bed, duvet, and two pillows as an interactive 3D assembly.
- Apply five-map textile bundles to duvet and pillow meshes: color, roughness, normal, displacement, and ambient occlusion.
- Adjust exposure, environment-light intensity, roughness, clearcoat, normal strength, and displacement.
- Toggle the environment background and automatic orbit, reset the scene, and refresh or switch the texture catalog.
- Camera interaction supports orbiting and field-of-view changes while keeping camera distance fixed.
- The current renderer and interaction model are web-based and use WebGPU through Three.js and React Three Fiber.
- The exact boundary of what may change in future work remains undecided; preserve the current product purpose, core inspection workflow, terminology, and functional assets unless the user explicitly changes them.

## Evidence on Hand

- 3D assets: `public/assets/bed.glb`, `public/assets/duvet.glb`, and `public/assets/pillow.glb`.
- Environment imagery: `public/assets/environment/indoor-001-tonemapped.jpg` and the source environment bundle under `public/IndoorEnvironmentHDRI001_4K/`.
- Textile material bundles under `public/textures/`, including Fabric 061 and Spatially variants.
- The implemented viewer and controls live in `components/material-viewer.tsx` and `components/texture-picker.tsx`.
- No customer proof, testimonials, commercial claims, pricing, or benchmark evidence is established; future work must not fabricate them.

## Product Principles

1. Judge materials in bedding context, not as isolated swatches.
2. Preserve fine color and surface detail as the primary object of evaluation.
3. Keep render controls direct, predictable, and useful to an internal development workflow.
4. Maintain a clear path between source texture bundles, mesh application, and the rendered result.
