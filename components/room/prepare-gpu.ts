import * as THREE from 'three';

// One renderer, one preparation job at a time. Never render or mutate the live scene.
const queues = new WeakMap<THREE.WebGLRenderer, Promise<void>>();
const whiteVariants = new WeakMap<THREE.Material, THREE.Material>();
export function createPreparationScene(
  root: THREE.Object3D,
  live: THREE.Scene,
) {
  const staging = new THREE.Scene();
  staging.environment = live.environment;
  staging.environmentIntensity = live.environmentIntensity;
  staging.environmentRotation.copy(live.environmentRotation);
  const content = root.clone(true);
  content.visible = true;
  content.traverse((object) => {
    object.frustumCulled = false;
  });
  staging.add(content);
  live.updateMatrixWorld(true);
  live.traverse((object) => {
    if (!(object instanceof THREE.Light)) return;
    const light = object.clone();
    object.matrixWorld.decompose(light.position, light.quaternion, light.scale);
    if (
      light instanceof THREE.DirectionalLight &&
      object instanceof THREE.DirectionalLight
    ) {
      object.target.getWorldPosition(light.target.position);
      staging.add(light.target);
    }
    staging.add(light);
  });
  return staging;
}

export function prepareGpu(
  gl: THREE.WebGLRenderer,
  root: THREE.Object3D,
  camera: THREE.Camera,
  scene: THREE.Scene,
  cancelled: () => boolean,
  textures: THREE.Texture[] = [],
) {
  const job = (queues.get(gl) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (cancelled()) return;
      const staging = createPreparationScene(root, scene);
      const stagingCamera = camera.clone();
      await gl.compileAsync(staging, stagingCamera);
      if (cancelled()) return;
      staging.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const prepared = materials.map((material) => {
          let variant = whiteVariants.get(material);
          if (!variant) {
          const retained: THREE.Material = material.clone();
          retained.onBeforeCompile = material.onBeforeCompile;
          retained.customProgramCacheKey = material.customProgramCacheKey;
          if ('map' in retained) retained.map = null;
          whiteVariants.set(material, retained);
          variant = retained;
            material.addEventListener('dispose', () => {
              retained.dispose();
              whiteVariants.delete(material);
            });
          }
          return variant;
        });
        object.material = Array.isArray(object.material)
          ? prepared
          : prepared[0];
      });
      await gl.compileAsync(staging, stagingCamera);
      if (cancelled()) return;
      const upload = createPreparationScene(root, scene);
      textures.forEach((texture) => gl.initTexture(texture));
      const target = new THREE.WebGLRenderTarget(32, 32);
      const previousTarget = gl.getRenderTarget();
      const viewport = gl.getViewport(new THREE.Vector4());
      const scissor = gl.getScissor(new THREE.Vector4());
      const scissorTest = gl.getScissorTest();
      try {
        gl.setRenderTarget(target);
        gl.setScissorTest(false);
        gl.render(upload, stagingCamera);
      } finally {
        gl.setRenderTarget(previousTarget);
        gl.setViewport(viewport);
        gl.setScissor(scissor);
        gl.setScissorTest(scissorTest);
        target.dispose();
      }
      const context = gl.getContext() as WebGL2RenderingContext;
      const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!fence) throw new Error('Could not prepare GPU resources');
      context.flush();
      try {
        await new Promise<void>((resolve, reject) => {
          const poll = () => {
            if (cancelled()) return resolve();
            const status = context.clientWaitSync(fence, 0, 0);
            if (status === context.WAIT_FAILED)
              reject(new Error('GPU preparation failed'));
            else if (status === context.TIMEOUT_EXPIRED)
              window.setTimeout(poll, 16);
            else resolve();
          };
          poll();
        });
      } finally {
        context.deleteSync(fence);
      }
    });
  queues.set(gl, job);
  return job;
}
