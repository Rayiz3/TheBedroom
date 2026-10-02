'use client';
import {
  PILLOW_PALETTE,
  type BedSize,
  type BeddingPalette,
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
}) {
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
          {(['pillow1', 'pillow2', 'duvet', 'pad'] as const).map(
            (part, index) => (
              <fieldset key={part} className={styles.paletteField}>
                <legend>
                  {['베개 1', '베개 2', '이불', '패드'][index]} ·{' '}
                  {
                    PILLOW_PALETTE.find(
                      (color) => color.id === props.palette[part],
                    )?.label
                  }
                </legend>
                <div
                  className={styles.paletteGrid}
                  role="radiogroup"
                  aria-label={`${part} 색상`}
                >
                  {PILLOW_PALETTE.map(({ id, label, path }) => (
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
                        style={{ backgroundImage: `url(${path})` }}
                        aria-hidden="true"
                      />
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
