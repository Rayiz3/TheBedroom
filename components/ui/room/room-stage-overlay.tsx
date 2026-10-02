import styles from '../../room-viewer.module.css';
import shellStyles from '../../viewer-shell.module.css';

export function RoomStageOverlay({
  ready,
  failed,
  modelPath,
}: {
  ready: boolean;
  failed: boolean;
  modelPath: string;
}) {
  return (
    <>
      {!ready && !failed && (
        <output className={shellStyles.loadingState} aria-live="polite">
          <span className={shellStyles.loadingRing} aria-hidden="true" />
          <p>룸 에셋을 불러오는 중</p>
        </output>
      )}
      <p className={`${shellStyles.hint} ${styles.hint}`}>
        드래그: 공전 · 스크롤: 확대 · 우클릭: 비활성
      </p>
    </>
  );
}
