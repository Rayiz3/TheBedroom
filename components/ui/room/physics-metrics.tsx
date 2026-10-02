'use client';
import { useSyncExternalStore } from 'react';
import {
  roomPerformance,
  saveRoomMeasurements,
} from '@/components/room/performance';
import styles from '../../room-viewer.module.css';

export function PhysicsMetrics() {
  const m = useSyncExternalStore(
    roomPerformance.subscribe,
    roomPerformance.getSnapshot,
    roomPerformance.getSnapshot,
  );
  const duration = (value: number | null) =>
    value === null ? '—' : `${value.toFixed(1)} ms`;
  return (
    <>
      <dl className={styles.metrics}>
        <dt>FPS</dt>
        <dd>{m.fps.toFixed(1)}</dd>
        <dt>프레임 간격</dt>
        <dd>{m.frameSeconds.toFixed(4)} sec</dd>
        <dt>프레임당 물리 진행 시간</dt>
        <dd>{m.physicsSeconds.toFixed(4)} sec</dd>
        <dt>물리·메시 갱신 CPU 시간</dt>
        <dd>{m.physicsMs.toFixed(2)} ms</dd>
        <dt>최초 mesh 표시</dt>
        <dd>
          {m.initialMs === null
            ? '—'
            : `${(m.initialMs / 1000).toFixed(2)} sec`}
        </dd>
        <dt>최근 옵션 갱신</dt>
        <dd>{duration(m.updateMs)}</dd>
      </dl>
    </>
  );
}

export function SavePhysicsMeasurements() {
  const m = useSyncExternalStore(
    roomPerformance.subscribe,
    roomPerformance.getSnapshot,
    roomPerformance.getSnapshot,
  );
  return (
    <button
      type="button"
      className={styles.saveMeasurements}
      onClick={saveRoomMeasurements}
      disabled={m.completedRuns === 0}
      title={
        m.completedRuns
          ? '완료된 시뮬레이션의 최악값을 TXT로 저장'
          : '시뮬레이션이 종료되면 저장할 수 있습니다'
      }
    >
      측정값 저장 (TXT)
    </button>
  );
}
