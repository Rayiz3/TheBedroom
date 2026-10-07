'use client';

import { useState } from 'react';
import { Check, ChevronDown, Sun } from 'lucide-react';
import {
  BEDDING_PALETTE,
  type BedSize,
  type BeddingPalette,
  type BeddingColor,
} from '@/components/room/config';
import styles from './configurator.module.css';

const COLOR_NAMES: Record<BeddingColor, string> = {
  none: '없음',
  ivory: '밀키 아이보리',
  sage: '뮤트 세이지',
  lilac: '더스트 라일락',
  blue: '에어 블루',
  rose: '파우더 로즈',
  taupe: '샌드 토프',
};
const COLOR_ORDER: BeddingColor[] = [
  'ivory',
  'sage',
  'lilac',
  'blue',
  'rose',
  'taupe',
  'none',
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
  onBulkPaletteChange,
  sunlight,
  onSunlightChange,
  lightEnabled,
  onLightToggle,
}: {
  bedSize: BedSize;
  onBedSizeChange: (value: BedSize) => void;
  palette: BeddingPalette;
  onPaletteChange: (value: BeddingPalette) => void;
  onBulkPaletteChange: (value: BeddingColor) => void;
  sunlight: number;
  onSunlightChange: (value: number) => void;
  lightEnabled: boolean;
  onLightToggle: () => void;
}) {
  const [openPalette, setOpenPalette] = useState<string | null>(null);
  const uniformColor = Object.values(palette).every(
    (color) => color === palette.duvet,
  )
    ? palette.duvet
    : null;
  const groups = [
    {
      id: 'all',
      label: '일괄 변경',
      color: uniformColor,
      onChange: onBulkPaletteChange,
    },
    ...PARTS.map((part) => ({
      ...part,
      color: palette[part.id],
      onChange: (color: BeddingColor) =>
        onPaletteChange({ ...palette, [part.id]: color }),
    })),
  ];
  return (
    <aside className={styles.panel} aria-label="침실 구성">
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
        {groups.map((part) => (
          <div key={part.id} className={styles.colorField}>
            <button
              type="button"
              className={styles.paletteToggle}
              aria-expanded={openPalette === part.id}
              aria-controls={`palette-${part.id}`}
              onClick={() =>
                setOpenPalette(openPalette === part.id ? null : part.id)
              }
            >
              <span>{part.label}</span>
              <span className={styles.colorName}>
                {part.color === null ? '혼합' : COLOR_NAMES[part.color]}
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <div
              id={`palette-${part.id}`}
              className={styles.swatches}
              hidden={openPalette !== part.id}
              role="radiogroup"
              aria-label={`${part.label} 색상`}
            >
              {COLOR_ORDER.map((id) => {
                const color = BEDDING_PALETTE.find((color) => color.id === id)!;
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
                      checked={part.color === id}
                      onChange={() => part.onChange(id)}
                    />
                    <span
                      className={styles.swatch}
                      style={
                        color.path
                          ? { backgroundImage: `url(${color.path})` }
                          : undefined
                      }
                    >
                      {id === 'none' ? (
                        <span className={styles.noneLabel}>없음</span>
                      ) : (
                        <Check size={15} strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
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
      <div className={styles.lightControl}>
        <span id="configurator-light-label">조명</span>
        <button
          type="button"
          role="switch"
          aria-checked={lightEnabled}
          aria-labelledby="configurator-light-label"
          onClick={onLightToggle}
          className={styles.lightToggle}
        >
          <span aria-hidden="true">{lightEnabled ? '켜짐' : '꺼짐'}</span>
          <i aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
