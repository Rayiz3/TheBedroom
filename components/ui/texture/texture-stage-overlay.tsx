import shellStyles from '../../viewer-shell.module.css';

export function TextureStageOverlay({ ready }: { ready: boolean }) {
  return (
    <>
      {!ready && (
        <div className={shellStyles.loadingState}>
          <span className={shellStyles.loadingRing} aria-hidden="true" />
          <p>침실 모델을 구성하는 중</p>
        </div>
      )}
      <p className={shellStyles.hint}>
        드래그: 공전 · 스크롤: 화각 변경 · 거리: 2 고정
      </p>
    </>
  );
}
