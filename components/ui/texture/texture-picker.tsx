'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import initialBundles, {
  canRefresh,
  type TextureBundle,
} from 'virtual:texture-bundles';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import styles from '../../material-viewer.module.css';

function isBundleList(value: unknown): value is TextureBundle[] {
  return (
    Array.isArray(value) &&
    value.every(
      (bundle) =>
        bundle &&
        typeof bundle.name === 'string' &&
        Array.isArray(bundle.paths) &&
        bundle.paths.length === 5 &&
        bundle.paths.every(
          (path: unknown) =>
            typeof path === 'string' && path.startsWith('/textures/'),
        ),
    )
  );
}

export function TexturePicker({
  selectedBundle,
  onSelect,
}: {
  selectedBundle: TextureBundle | undefined;
  onSelect: (bundle: TextureBundle) => void;
}) {
  const [bundles, setBundles] = useState(initialBundles);
  const [refreshing, setRefreshing] = useState(canRefresh);
  const refreshBundles = useCallback(
    () =>
      fetch('/__texture-bundles', { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error('Unable to refresh textures');
          return response.json() as Promise<unknown>;
        })
        .then((nextBundles) => {
          if (!isBundleList(nextBundles))
            throw new Error('Invalid texture catalog');
          setBundles(nextBundles);
        })
        .finally(() => setRefreshing(false)),
    [],
  );

  useEffect(() => {
    if (canRefresh) void refreshBundles();
  }, [refreshBundles]);

  const selectedIsMissing =
    selectedBundle &&
    !bundles.some((bundle) => bundle.name === selectedBundle.name);

  return (
    <div className={`${styles.textureSelect} ${styles.developerOption}`}>
      <div className={styles.textureSelectHeading}>
        <span>텍스처 (Texture)</span>
        {canRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="텍스처 목록 새로고침 (Refresh Textures)"
            title="텍스처 목록 새로고침 (Refresh Textures)"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              void refreshBundles();
            }}
          >
            <RefreshCw />
          </Button>
        )}
      </div>
      <Select
        value={selectedBundle?.name ?? null}
        onValueChange={(name) => {
          if (!name || name === selectedBundle?.name) return;
          const nextBundle = bundles.find((bundle) => bundle.name === name);
          if (nextBundle) onSelect(nextBundle);
        }}
      >
        <SelectTrigger size="sm" aria-label="텍스처 선택">
          <SelectValue placeholder="사용 가능한 텍스처 없음" />
        </SelectTrigger>
        <SelectContent
          className={styles.selectContent}
          side="bottom"
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
          collisionAvoidance={{ side: 'flip', align: 'shift' }}
        >
          {selectedIsMissing && (
            <SelectItem value={selectedBundle.name} disabled>
              {selectedBundle.name}
            </SelectItem>
          )}
          {bundles.map((bundle) => (
            <SelectItem key={bundle.name} value={bundle.name}>
              {bundle.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedIsMissing && (
        <p className={styles.textureSelectStatus}>
          현재 텍스처의 파일이 없습니다. 기존 렌더링은 유지됩니다.
        </p>
      )}
    </div>
  );
}
