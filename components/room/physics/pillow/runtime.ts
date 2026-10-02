import RAPIER from '@dimforge/rapier3d-compat';
let initialization: Promise<void> | undefined;
export function initializePillowPhysics() {
  return (initialization ??= RAPIER.init());
}
