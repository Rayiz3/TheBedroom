'use client';

import { useLoader } from '@react-three/fiber';
import { Component, type ReactNode } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { ROOM_BINDING_PATHS } from '@/components/room/room-assets';
import {
  ROOM_MODEL_PATHS,
  FABRIC_DATA_TEXTURE_PATHS,
  ROOM_BACKGROUND_PATH,
  ROOM_HDRI_OPTIONS,
  PILLOW_PALETTE,
} from '@/components/room/config';
import styles from '../../room-viewer.module.css';

export class RoomViewerBoundary extends Component<
  {
    children: ReactNode;
    modelPath: string;
    onError: () => void;
    onRetry: () => void;
  },
  { failed: boolean; modelPath: string }
> {
  state = { failed: false, modelPath: this.props.modelPath };

  static getDerivedStateFromProps(
    props: { modelPath: string },
    state: { modelPath: string },
  ) {
    if (props.modelPath !== state.modelPath) {
      return { failed: false, modelPath: props.modelPath };
    }
    return null;
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  retry = () => {
    ROOM_MODEL_PATHS.forEach((path) => useLoader.clear(GLTFLoader, path));
    ROOM_BINDING_PATHS.forEach((path) =>
      useLoader.clear(THREE.FileLoader, path),
    );
    useLoader.clear(THREE.TextureLoader, [...FABRIC_DATA_TEXTURE_PATHS]);
    useLoader.clear(THREE.TextureLoader, ROOM_BACKGROUND_PATH);
    PILLOW_PALETTE.forEach(({ path }) =>
      useLoader.clear(THREE.TextureLoader, path),
    );
    useLoader.clear(
      EXRLoader,
      ROOM_HDRI_OPTIONS.map((option) => option.path),
    );
    this.props.onRetry();
    this.setState({ failed: false });
  };

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.error} role="alert">
          <strong>침대 모델을 불러오지 못했습니다</strong>
          <p>파일 연결을 확인한 뒤 다시 시도해 주세요.</p>
          <button type="button" onClick={this.retry}>
            다시 불러오기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
