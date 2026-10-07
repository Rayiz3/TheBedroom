import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Prepared bed sizes share a camera, including its current orbit target.
const cameraControls = new WeakMap<THREE.Camera, OrbitControls>();
export function getCameraControls(camera: THREE.Camera) {
  let controls = cameraControls.get(camera);
  if (!controls) {
    const stagingCamera = camera.clone();
    // The intro's top-view up vector must not become the orbit rotation basis.
    stagingCamera.up.set(0, 1, 0);
    controls = new OrbitControls(stagingCamera);
    cameraControls.set(camera, controls);
  }
  return controls;
}
