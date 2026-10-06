'use client';
import {
  BEDDING_PALETTE,
  type BedSize,
  type BeddingPalette,
  type BeddingColor,
} from '@/components/room/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import styles from '../../room-viewer.module.css';

export function RoomProductPanel(props: {
  bedSize: BedSize;
  onBedSizeChange: (value: BedSize) => void;
  palette: BeddingPalette;
  onPaletteChange: (value: BeddingPalette) => void;
  onBulkPaletteChange: (value: BeddingColor) => void;
}) {
  const uniformColor = Object.values(props.palette).every(
    (color) => color === props.palette.duvet,
  )
    ? props.palette.duvet
    : null;
  return (
    <aside
      className={`${styles.controlPanel} ${styles.leftPanel}`}
      aria-label="Room product controls"
    >
      <div className={styles.controlPanelBody}>
        <section className={styles.controlGroup}>
          <div className={styles.controlGroupTitle}>BED SIZE</div>
          <label className={styles.selectField} htmlFor="room-bed-size">
            <span>침대 사이즈</span>
            <Select
              value={props.bedSize}
              onValueChange={(next) => {
                if (next === 'single' || next === 'queen')
                  props.onBedSizeChange(next);
              }}
            >
              <SelectTrigger
                id="room-bed-size"
                size="sm"
                aria-label="침대 사이즈 선택"
              >
                <SelectValue>
                  {props.bedSize === 'single' ? '싱글' : '퀸'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className={styles.selectContent}
                side="bottom"
                sideOffset={4}
                align="start"
                alignItemWithTrigger={false}
                collisionAvoidance={{ side: 'flip', align: 'shift' }}
              >
                <SelectItem value="single">싱글</SelectItem>
                <SelectItem value="queen">퀸</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </section>

        <section className={styles.controlGroup}>
          <div className={styles.controlGroupTitle}>PALETTE</div>
          <fieldset className={styles.paletteField}>
            <legend>
              일괄 변경 ·{' '}
              {BEDDING_PALETTE.find((color) => color.id === uniformColor)
                ?.label ?? '혼합'}
            </legend>
            <div
              className={styles.paletteGrid}
              role="radiogroup"
              aria-label="전체 아이템 색상"
            >
              {BEDDING_PALETTE.map(({ id, label, path }) => (
                <label
                  key={id}
                  title={label}
                  className={`${styles.paletteOption} ${uniformColor === id ? styles.selected : ''}`}
                >
                  <input
                    className={styles.paletteInput}
                    type="radio"
                    name="all-palette"
                    aria-label={`전체 ${label}`}
                    value={id}
                    checked={uniformColor === id}
                    onChange={() => props.onBulkPaletteChange(id)}
                  />
                  <span
                    className={styles.paletteSwatch}
                    style={
                      path ? { backgroundImage: `url(${path})` } : undefined
                    }
                    aria-hidden="true"
                  >
                    {id === 'none' ? '없음' : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {(['pillow1', 'pillow2', 'duvet', 'pad'] as const).map(
            (part, index) => (
              <fieldset key={part} className={styles.paletteField}>
                <legend>
                  {['베개 1', '베개 2', '이불', '패드'][index]} ·{' '}
                  {
                    BEDDING_PALETTE.find(
                      (color) => color.id === props.palette[part],
                    )?.label
                  }
                </legend>
                <div
                  className={styles.paletteGrid}
                  role="radiogroup"
                  aria-label={`${part} 색상`}
                >
                  {BEDDING_PALETTE.map(({ id, label, path }) => (
                    <label
                      key={id}
                      title={label}
                      className={`${styles.paletteOption} ${props.palette[part] === id ? styles.selected : ''}`}
                    >
                      <input
                        className={styles.paletteInput}
                        type="radio"
                        name={`${part}-palette`}
                        aria-label={label}
                        value={id}
                        checked={props.palette[part] === id}
                        onChange={() =>
                          props.onPaletteChange({
                            ...props.palette,
                            [part]: id,
                          })
                        }
                      />
                      <span
                        className={styles.paletteSwatch}
                        style={
                          path ? { backgroundImage: `url(${path})` } : undefined
                        }
                        aria-hidden="true"
                      >
                        {id === 'none' ? '없음' : null}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ),
          )}
        </section>
      </div>
    </aside>
  );
}
