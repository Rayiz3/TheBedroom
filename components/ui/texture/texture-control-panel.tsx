'use client';

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import type { TextureBundle } from 'virtual:texture-bundles';

import {
  LEGACY_DUVET_TEXTURE_REPEAT,
  type DuvetRepeatMode,
  type ViewerSettings,
} from '@/components/texture/config';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import styles from '../../material-viewer.module.css';
import { TexturePicker } from './texture-picker';

function ControlRow({
  label,
  description,
  value,
  display,
  min,
  max,
  step,
  onValueChange,
}: {
  label: string;
  description: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className={styles.controlRow}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={styles.controlRowLabel}
          delay={1000}
          closeDelay={100}
        >
          {label}
        </TooltipTrigger>
        <TooltipContent
          side="left"
          sideOffset={10}
          className={styles.controlTooltip}
        >
          {description}
        </TooltipContent>
      </Tooltip>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) =>
          onValueChange(Array.isArray(next) ? (next[0] ?? value) : next)
        }
      />
      <output>{display}</output>
    </div>
  );
}

function DuvetRepeatControl({
  value,
  physicalRepeat,
  onValueChange,
}: {
  value: DuvetRepeatMode;
  physicalRepeat: readonly [number, number];
  onValueChange: (value: DuvetRepeatMode) => void;
}) {
  const controlRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={controlRef} className={styles.developerOption}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={styles.developerOptionLabel}
          delay={1000}
          closeDelay={100}
        >
          이불 패치 축척 (Duvet Patch Scale)
        </TooltipTrigger>
        <TooltipContent
          side="left"
          sideOffset={10}
          className={styles.controlTooltip}
        >
          자동 축척은 이불 전체의 기존 UV 밀도를 측정해 원단 패치 한 장이
          9×9cm로 보이도록 반복값을 계산합니다. 비교값은 U와 V 모두 20.5입니다.
        </TooltipContent>
      </Tooltip>
      <Select
        value={value}
        onOpenChange={(open) => {
          if (open) controlRef.current?.scrollIntoView({ block: 'center' });
        }}
        onValueChange={(next) => {
          if (next === 'physical' || next === 'legacy') onValueChange(next);
        }}
      >
        <SelectTrigger size="sm" aria-label="이불 패치 축척 선택">
          <SelectValue>
            {value === 'physical'
              ? `자동 축척 (${physicalRepeat[0].toFixed(2)} × ${physicalRepeat[1].toFixed(2)})`
              : `비교값 (${LEGACY_DUVET_TEXTURE_REPEAT.toFixed(1)} × ${LEGACY_DUVET_TEXTURE_REPEAT.toFixed(1)})`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className={styles.selectContent}
          side="bottom"
          sideOffset={2}
          align="start"
          alignItemWithTrigger={false}
          collisionAvoidance={{ side: 'none', align: 'shift' }}
        >
          <SelectItem value="physical">
            자동 축척 ({physicalRepeat[0].toFixed(2)} ×{' '}
            {physicalRepeat[1].toFixed(2)})
          </SelectItem>
          <SelectItem value="legacy">
            비교값 ({LEGACY_DUVET_TEXTURE_REPEAT.toFixed(1)} ×{' '}
            {LEGACY_DUVET_TEXTURE_REPEAT.toFixed(1)})
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function StochasticTilingControl({
  enabled,
  onValueChange,
}: {
  enabled: boolean;
  onValueChange: (enabled: boolean) => void;
}) {
  return (
    <div className={styles.developerOption}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={styles.developerOptionLabel}
          delay={1000}
          closeDelay={100}
        >
          확률적 타일링 (Stochastic Tiling)
        </TooltipTrigger>
        <TooltipContent
          side="left"
          sideOffset={10}
          className={styles.controlTooltip}
        >
          베개와 이불의 컬러 맵을 서로 다른 오프셋으로 혼합해 반복 격자를
          줄입니다. 끄면 기존의 규칙적인 컬러 맵 반복으로 돌아갑니다.
        </TooltipContent>
      </Tooltip>
      <Select
        value={enabled ? 'on' : 'off'}
        onValueChange={(next) => {
          if (next === 'on' || next === 'off') onValueChange(next === 'on');
        }}
      >
        <SelectTrigger size="sm" aria-label="확률적 타일링 선택">
          <SelectValue>
            {enabled ? '사용 (On)' : '사용 안 함 (Off)'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className={styles.selectContent}
          side="bottom"
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
          collisionAvoidance={{ side: 'flip', align: 'shift' }}
        >
          <SelectItem value="on">사용 (On)</SelectItem>
          <SelectItem value="off">사용 안 함 (Off)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

type TextureControlPanelProps = {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  settings: ViewerSettings;
  onSettingChange: <K extends keyof ViewerSettings>(
    key: K,
    value: ViewerSettings[K],
  ) => void;
  onReset: () => void;
  stochasticTiling: boolean;
  onStochasticTilingChange: (value: boolean) => void;
  duvetRepeatMode: DuvetRepeatMode;
  duvetPhysicalRepeat: readonly [number, number];
  onDuvetRepeatModeChange: (value: DuvetRepeatMode) => void;
  selectedBundle: TextureBundle | undefined;
  onTextureSelect: (bundle: TextureBundle) => void;
};

export function TextureControlPanel(props: TextureControlPanelProps) {
  const { settings } = props;
  return (
    <aside
      className={`${styles.controlPanel} ${props.collapsed ? styles.collapsed : ''}`}
      aria-label="Render controls"
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
            <div className={styles.controlGroupTitle}>
              <span>ENVIRONMENT</span>
            </div>
            <ControlRow
              label="노출 (Exposure)"
              description="렌더링 전체의 밝기를 조절합니다. 높이면 장면과 배경이 밝아지고, 낮추면 어두워집니다."
              value={settings.exposure}
              display={settings.exposure.toFixed(2)}
              min={0.5}
              max={4}
              step={0.01}
              onValueChange={(value) =>
                props.onSettingChange('exposure', value)
              }
            />
            <ControlRow
              label="환경광 (Environment)"
              description="주변 환경에서 물체에 들어오는 빛과 반사의 강도를 조절합니다. 배경 이미지 자체의 밝기는 바뀌지 않습니다."
              value={settings.envIntensity}
              display={settings.envIntensity.toFixed(2)}
              min={0}
              max={2.5}
              step={0.01}
              onValueChange={(value) =>
                props.onSettingChange('envIntensity', value)
              }
            />
          </section>
          <section className={styles.controlGroup}>
            <div className={styles.controlGroupTitle}>
              <span>MATERIAL</span>
            </div>
            <ControlRow
              label="거칠기 (Roughness)"
              description="베개와 이불 표면의 거칠기를 조절합니다. 낮으면 반사가 선명하고 매끈하게, 높으면 반사가 퍼져 무광에 가깝게 보입니다."
              value={settings.roughness}
              display={settings.roughness.toFixed(2)}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(value) =>
                props.onSettingChange('roughness', value)
              }
            />
            <ControlRow
              label="클리어코트 (Clearcoat)"
              description="베개와 이불 위에 투명한 코팅층 같은 추가 광택을 더합니다. 0이면 코팅 광택이 없고, 높일수록 더 강하게 반사됩니다."
              value={settings.clearcoat}
              display={settings.clearcoat.toFixed(2)}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(value) =>
                props.onSettingChange('clearcoat', value)
              }
            />
            <ControlRow
              label="노멀 강도 (Normal Strength)"
              description="직물의 미세한 요철이 빛에 드러나는 강도입니다. 높일수록 섬유결이 도드라지지만, 실제 외곽 형태는 바뀌지 않습니다."
              value={settings.normalScale}
              display={settings.normalScale.toFixed(2)}
              min={0}
              max={2}
              step={0.01}
              onValueChange={(value) =>
                props.onSettingChange('normalScale', value)
              }
            />
            <ControlRow
              label="변위 (Displacement)"
              description="높이 맵으로 베개와 이불의 실제 표면을 변형합니다. 0이면 변형하지 않으며, 높일수록 요철이 커집니다."
              value={settings.displacement}
              display={settings.displacement.toFixed(3)}
              min={0}
              max={0.05}
              step={0.001}
              onValueChange={(value) =>
                props.onSettingChange('displacement', value)
              }
            />
          </section>
          <section className={`${styles.controlGroup} ${styles.switches}`}>
            <label htmlFor="environment-background">
              <span>환경 배경</span>
              <Switch
                id="environment-background"
                checked={settings.showEnvironment}
                onCheckedChange={(checked) =>
                  props.onSettingChange('showEnvironment', checked)
                }
                aria-label="Show environment background"
              />
            </label>
            <label htmlFor="auto-orbit">
              <span>자동 공전</span>
              <Switch
                id="auto-orbit"
                checked={settings.autoRotate}
                onCheckedChange={(checked) =>
                  props.onSettingChange('autoRotate', checked)
                }
                aria-label="Auto orbit camera"
              />
            </label>
          </section>
          <Button
            type="button"
            variant="outline"
            className={styles.resetButton}
            onClick={props.onReset}
          >
            <RotateCcw /> 장면 초기화
          </Button>
          <section className={styles.developerOptions}>
            <div className={styles.controlGroupTitle}>
              <span>DEVELOPMENT</span>
            </div>
            <StochasticTilingControl
              enabled={props.stochasticTiling}
              onValueChange={props.onStochasticTilingChange}
            />
            <DuvetRepeatControl
              value={props.duvetRepeatMode}
              physicalRepeat={props.duvetPhysicalRepeat}
              onValueChange={props.onDuvetRepeatModeChange}
            />
            <TexturePicker
              selectedBundle={props.selectedBundle}
              onSelect={props.onTextureSelect}
            />
          </section>
        </div>
      )}
    </aside>
  );
}
