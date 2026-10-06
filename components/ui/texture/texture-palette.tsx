'use client';

import { PILLOW_PALETTE } from '@/components/room/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import styles from '../../material-viewer.module.css';

export function TexturePalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className={styles.controlGroup} aria-label="팔레트">
      <div className={styles.controlGroupTitle}>PALETTE</div>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next && next !== value) onChange(next);
        }}
      >
        <SelectTrigger size="sm" aria-label="컬러 맵 선택">
          <SelectValue>
            {value === 'bundle'
              ? '텍스처 번들 원본'
              : PILLOW_PALETTE.find((color) => color.id === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className={styles.selectContent}
          alignItemWithTrigger={false}
        >
          <SelectItem value="bundle">텍스처 번들 원본</SelectItem>
          {PILLOW_PALETTE.map((color) => (
            <SelectItem key={color.id} value={color.id}>
              <img src={color.path} alt="" width={18} height={18} />
              {color.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}
