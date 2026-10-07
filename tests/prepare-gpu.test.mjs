import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { prepareGpu } = await loadTypescript(
  new URL('../components/room/prepare-gpu.ts', import.meta.url),
);

test('preparation waits for shader compilation and GPU completion before playback can start', async () => {
  let finishCompile;
  const compile = new Promise((resolve) => {
    finishCompile = resolve;
  });
  class Context {
    SYNC_GPU_COMMANDS_COMPLETE = 1;
    WAIT_FAILED = 2;
    TIMEOUT_EXPIRED = 3;
    complete = false;
    fenceSync() {
      return {};
    }
    flush() {}
    clientWaitSync() {
      return this.complete ? 4 : this.TIMEOUT_EXPIRED;
    }
    deleteSync() {
      this.deleted = true;
    }
  }
  const originalContext = globalThis.WebGL2RenderingContext;
  const originalWindow = globalThis.window;
  globalThis.WebGL2RenderingContext = Context;
  globalThis.window = { setTimeout };
  const context = new Context();
  const root = new THREE.Group();
  root.visible = false;
  let renders = 0;
  let currentTarget = null;
  const renderer = {
    compileAsync: () => compile,
    getRenderTarget: () => currentTarget,
    setRenderTarget: (target) => {
      currentTarget = target;
    },
    getViewport: (v) => v.set(0, 0, 800, 600),
    getScissor: (v) => v.set(0, 0, 800, 600),
    getScissorTest: () => true,
    setViewport() {},
    setScissor() {},
    setScissorTest() {},
    render(staging, stagingCamera) {
      renders++;
      assert.equal(root.visible, false);
      assert.notEqual(staging, live);
      assert.notEqual(staging.children[0], root);
      assert.equal(staging.children[0].visible, true);
      assert.notEqual(stagingCamera, camera);
    },
    getContext: () => context,
  };
  const live = new THREE.Scene();
  live.add(root);
  const camera = new THREE.PerspectiveCamera();
  try {
    let ready = false;
    const pending = prepareGpu(renderer, root, camera, live, () => false).then(
      () => {
        ready = true;
      },
    );
    assert.equal(renders, 0);
    assert.equal(ready, false);
    finishCompile();
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(renders, 1);
    assert.equal(root.visible, false);
    assert.equal(currentTarget, null);
    assert.equal(ready, false);
    context.complete = true;
    await pending;
    assert.equal(ready, true);
    assert.equal(context.deleted, true);
  } finally {
    globalThis.WebGL2RenderingContext = originalContext;
    globalThis.window = originalWindow;
  }
});
