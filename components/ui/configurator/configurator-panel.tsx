'use client';

import { Check, Sun } from 'lucide-react';
import {
  PILLOW_PALETTE,
  type BedSize,
  type BeddingPalette,
  type Palette,
} from '@/components/room/config';
import styles from './configurator.module.css';

const COLOR_NAMES: Record<Palette, string> = {
  ivory: '밀키 아이보리',
  sage: '뮤트 세이지',
  lilac: '더스트 라일락',
  blue: '에어 블루',
  rose: '파우더 로즈',
  taupe: '샌드 토프',
};
const COLOR_ORDER: Palette[] = [
  'ivory',
  'sage',
  'lilac',
  'blue',
  'rose',
  'taupe',
];
const PARTS = [
  { id: 'duvet', label: '이불' },
  { id: 'pillow1', label: '베개 1' },
  { id: 'pillow2', label: '베개 2' },
  { id: 'pad', label: '패드' },
] as const;

export function ConfiguratorPanel({
  bedSize,
  onBedSizeChange,
  palette,
  onPaletteChange,
  sunlight,
  onSunlightChange,
}: {
  bedSize: BedSize;
  onBedSizeChange: (value: BedSize) => void;
  palette: BeddingPalette;
  onPaletteChange: (value: BeddingPalette) => void;
  sunlight: number;
  onSunlightChange: (value: number) => void;
}) {
  return (
    <aside className={styles.panel} aria-label="침실 구성">
      <div className={styles.intro}>
        <h1>
          Change <br />
          Your Space.
        </h1>
        <p>좋아하는 색으로, 나다운 침실.</p>
      </div>
      <fieldset className={styles.sizeField}>
        <legend>침대 사이즈</legend>
        <div className={styles.sizes}>
          {(
            [
              { id: 'single', label: '싱글', short: 'S' },
              { id: 'queen', label: '퀸', short: 'Q' },
            ] as const
          ).map((size) => (
            <label key={size.id} className={styles.sizeOption}>
              <input
                type="radio"
                name="configurator-size"
                value={size.id}
                checked={bedSize === size.id}
                onChange={() => onBedSizeChange(size.id)}
              />
              <span>
                <b>{size.short}</b>
                {size.label}
                <Check size={14} aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.colors}>
        {PARTS.map((part) => (
          <fieldset key={part.id} className={styles.colorField}>
            <legend>
              <span>{part.label}</span>
              <span className={styles.colorName}>
                {COLOR_NAMES[palette[part.id]]}
              </span>
            </legend>
            <div className={styles.swatches}>
              {COLOR_ORDER.map((id) => {
                const color = PILLOW_PALETTE.find((color) => color.id === id)!;
                return (
                  <label
                    className={styles.swatchOption}
                    key={id}
                    title={COLOR_NAMES[id]}
                  >
                    <input
                      type="radio"
                      name={`configurator-${part.id}`}
                      value={id}
                      aria-label={`${part.label} ${COLOR_NAMES[id]}`}
                      checked={palette[part.id] === id}
                      onChange={() =>
                        onPaletteChange({ ...palette, [part.id]: id })
                      }
                    />
                    <span
                      className={styles.swatch}
                      style={{ backgroundImage: `url(${color.path})` }}
                    >
                      <Check size={15} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <section className={styles.sunlight} aria-labelledby="sunlight-label">
        <div className={styles.sunlightHeading}>
          <label id="sunlight-label" htmlFor="configurator-sunlight">
            <Sun size={17} strokeWidth={1.5} />
            채광
          </label>
          <output htmlFor="configurator-sunlight">{sunlight}°</output>
        </div>
        <input
          id="configurator-sunlight"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={sunlight}
          aria-valuetext={`${sunlight}도`}
          onChange={(event) =>
            onSunlightChange(event.currentTarget.valueAsNumber)
          }
        />
        <p>빛의 방향을 바꾸며 색감을 살펴보세요.</p>
      </section>
    </aside>
  );
}
