'use client';
import type { IntroPhase } from '@/components/room/intro-state';
import styles from './configurator.module.css';

export function ConfiguratorLoading({
  phase,
  progress,
  roomProgress,
}: {
  phase: IntroPhase;
  progress: number;
  roomProgress: number;
}) {
  return (
    <>
      <output
        className={styles.introCover}
        data-open={phase !== 'bed'}
        aria-hidden={phase !== 'bed'}
        aria-live="polite"
      >
        <div className={styles.introIdentity}>
          <span className={styles.introWordmark}>Spatially</span>
          <progress
            className={styles.introRule}
            aria-label="침대 모델 로딩"
            max={100}
            value={progress}
          />
          <span className={styles.introCaption}>
            침대를 준비하고 있어요 · {progress}%
          </span>
        </div>
      </output>
      {(phase === 'room' || phase === 'reveal') && (
        <output className={styles.introStatus} aria-live="polite">
          <progress
            className={`${styles.introRule} ${styles.roomRule}`}
            aria-label="침실 준비 진행률"
            max={100}
            value={phase === 'room' ? roomProgress : 100}
          />
          {phase === 'room'
            ? `침실을 불러오는 중 · ${roomProgress}%`
            : '침실을 열고 있어요'}
        </output>
      )}
    </>
  );
}
