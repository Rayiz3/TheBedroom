import { BedroomAssembly } from './bedroom-assembly';
import { CameraControls } from './camera-controls';
import type { DuvetRepeatMode, ViewerSettings } from './config';
import { TextureEnvironment } from './environment';

export function RenderScene({
  settings,
  texturePaths,
  duvetRepeatMode,
  stochasticTiling,
  onDuvetRepeatCalculated,
  resetKey,
  onReady,
}: {
  settings: ViewerSettings;
  texturePaths: string[];
  duvetRepeatMode: DuvetRepeatMode;
  stochasticTiling: boolean;
  onDuvetRepeatCalculated: (repeat: readonly [number, number]) => void;
  resetKey: number;
  onReady: () => void;
}) {
  return (
    <>
      <TextureEnvironment settings={settings} />
      <BedroomAssembly
        settings={settings}
        texturePaths={texturePaths}
        duvetRepeatMode={duvetRepeatMode}
        stochasticTiling={stochasticTiling}
        onDuvetRepeatCalculated={onDuvetRepeatCalculated}
        onReady={onReady}
      />
      <CameraControls autoRotate={settings.autoRotate} resetKey={resetKey} />
    </>
  );
}
