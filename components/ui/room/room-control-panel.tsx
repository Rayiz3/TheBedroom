'use client';

import { PhysicsMetrics, SavePhysicsMeasurements } from './physics-metrics';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ROOM_HDRI_OPTIONS, type RoomHdri } from '@/components/room/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import styles from '../../room-viewer.module.css';

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.rangeControl}>
      <span className={styles.rangeMeta}>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{valueLabel}</output>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueLabel}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}

type RoomControlPanelProps = {
  onSaveEnvironmentDefaults: () => void;
  environmentSaveMessage: string;
  hdriSource: RoomHdri;
  onHdriSourceChange: (value: RoomHdri) => void;
  showColliders: boolean;
  onShowCollidersChange: (value: boolean) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  hdriIntensity: number;
  onHdriIntensityChange: (value: number) => void;
  ambientIntensity: number;
  onAmbientIntensityChange: (value: number) => void;
  directionalIntensity: number;
  onDirectionalIntensityChange: (value: number) => void;
  directionalDirection: number;
  onDirectionalDirectionChange: (value: number) => void;
  directionalElevation: number;
  onDirectionalElevationChange: (value: number) => void;
};

export function RoomControlPanel(props: RoomControlPanelProps) {
  return (
    <aside
      className={`${styles.controlPanel} ${props.collapsed ? styles.collapsed : ''}`}
      aria-label="Room render controls"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={styles.panelToggle}
        aria-label={props.collapsed ? '설정 펼치기' : '설정 접기'}
        aria-expanded={!props.collapsed}
        onClick={() => props.onCollapsedChange(!props.collapsed)}
      >
        {props.collapsed ? <ChevronLeft /> : <ChevronRight />}
      </Button>

      {!props.collapsed && (
        <div className={styles.controlPanelBody}>
          <section className={styles.controlGroup}>
            <div className={styles.controlGroupTitle}>PHYSICS</div>
            <PhysicsMetrics />
            <SavePhysicsMeasurements />
            <label>
              <input
                type="checkbox"
                checked={props.showColliders}
                onChange={(event) =>
                  props.onShowCollidersChange(event.currentTarget.checked)
                }
              />{' '}
              Collider wireframe 표시
            </label>
          </section>
          <section className={styles.controlGroup}>
            <div className={styles.controlGroupTitle}>ENVIRONMENT</div>
            <div className={styles.rangeControl}>
              <label id="room-hdri-source-label" htmlFor="room-hdri-source">
                HDRI 선택
              </label>
              <Select
                value={props.hdriSource}
                onValueChange={(value) => {
                  const option = ROOM_HDRI_OPTIONS.find(
                    (option) => option.id === value,
                  );
                  if (option) props.onHdriSourceChange(option.id);
                }}
              >
                <SelectTrigger
                  id="room-hdri-source"
                  size="sm"
                  aria-labelledby="room-hdri-source-label"
                >
                  <SelectValue>
                    {
                      ROOM_HDRI_OPTIONS.find(
                        (option) => option.id === props.hdriSource,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {ROOM_HDRI_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.rangeStack}>
              <RangeControl
                id="room-hdri-intensity"
                label="HDRI 세기"
                value={props.hdriIntensity}
                min={0}
                max={2}
                step={0.05}
                valueLabel={props.hdriIntensity.toFixed(2)}
                onChange={props.onHdriIntensityChange}
              />
              <RangeControl
                id="room-ambient-intensity"
                label="Ambient 세기"
                value={props.ambientIntensity}
                min={0}
                max={2}
                step={0.05}
                valueLabel={props.ambientIntensity.toFixed(2)}
                onChange={props.onAmbientIntensityChange}
              />
              <RangeControl
                id="room-directional-intensity"
                label="Directional 세기"
                value={props.directionalIntensity}
                min={0}
                max={10}
                step={0.1}
                valueLabel={props.directionalIntensity.toFixed(1)}
                onChange={props.onDirectionalIntensityChange}
              />
            </div>
            <div className={`${styles.rangeStack} ${styles.directionControls}`}>
              <RangeControl
                id="room-directional-direction"
                label="Directional 위치 · Y축 회전"
                value={props.directionalDirection}
                min={-180}
                max={180}
                step={1}
                valueLabel={`${props.directionalDirection}°`}
                onChange={props.onDirectionalDirectionChange}
              />
              <RangeControl
                id="room-directional-elevation"
                label="Directional 고도"
                value={props.directionalElevation}
                min={0}
                max={90}
                step={1}
                valueLabel={`${props.directionalElevation.toFixed(0)}°`}
                onChange={props.onDirectionalElevationChange}
              />
            </div>
            <button
              type="button"
              className={styles.saveMeasurements}
              onClick={props.onSaveEnvironmentDefaults}
            >
              기본값으로 설정
            </button>
            <output className={styles.metricNote} aria-live="polite">
              {props.environmentSaveMessage}
            </output>
          </section>
        </div>
      )}
    </aside>
  );
}
