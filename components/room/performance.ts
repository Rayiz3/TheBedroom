export type RoomMetrics = {
  fps: number;
  frameSeconds: number;
  physicsSeconds: number;
  physicsMs: number;
  initialMs: number | null;
  updateMs: number | null;
  completedRuns: number;
};
let snapshot: RoomMetrics = {
  fps: 0,
  frameSeconds: 0,
  physicsSeconds: 0,
  physicsMs: 0,
  initialMs: null,
  updateMs: null,
  completedRuns: 0,
};
const listeners = new Set<() => void>();
type Phase = { total: number; max: number };
function addPhase(phase: Phase, ms: number) {
  phase.total += ms;
  phase.max = Math.max(phase.max, ms);
}
const phaseNames = [
  '베개 bake 재생',
  '이불 물리 계산',
  '이불 메시 변형 (렌더 노멀 제외)',
  '이불 렌더 노멀 계산',
  '기타 갱신·계측 오버헤드',
] as const;
type Run = {
  phases: Phase[];
  configurations: Set<string>;
  frames: number;
  wall: number;
  physics: number;
  maxFrame: number;
  minPhysics: number;
  maxPhysics: number;
  maxCpu: number;
  initialMs: number | null;
  maxUpdateMs: number | null;
};
let active: Run | null = null;
const completed: Run[] = [];
const duration = (value: number | null) =>
  value === null ? '측정 없음' : value.toFixed(3);

export function formatRoomMeasurements() {
  const lines = [
    '저장 시각: ' + new Date().toISOString(),
    '[최저 FPS] 측정된 최대 프레임 간격의 역수(1 / 초). 실행 중 가장 느린 프레임에 해당하며 평균 FPS가 아닙니다.',
    '[최대 프레임 간격] 연속된 렌더 프레임 사이 경과 시간의 최댓값(sec). 물리 계산뿐 아니라 렌더링·대기 등 프레임 전체의 지연을 반영합니다.',
    '[프레임당 물리 진행 시간] 한 렌더 프레임에서 이불 시뮬레이션이 진행한 가상 시간(sec)의 최소·최대. 계산에 걸린 실제 시간이 아니며, 고정 스텝 적산 중에는 0일 수 있습니다.',
    '[최대 물리·메시 갱신 CPU 시간] 한 프레임의 베개 bake 재생부터 이불 메시·디버그 갱신까지 걸린 메인 스레드 경과 시간의 최댓값(ms). GPU 그리기 시간은 제외합니다.',
    '[최초 mesh 표시] 초기 측정 시작부터 장면 준비 후 최초 렌더 제출까지의 경과 시간(ms). GPU 렌더 완료 시점은 아닙니다.',
    '[최대 옵션 갱신 시간] 옵션 변경 계측 시작부터 변경 상태의 렌더 제출까지 측정한 시간 중 해당 실행에서 기록된 최댓값(ms). 측정이 없으면 측정 없음으로 표시합니다.',
    '[누적 프레임 간격] 집계한 프레임 간격의 합계(sec). 물리 진행 배율의 실제 시간 기준입니다.',
    '[누적 물리 진행 시간] 집계한 프레임에서 이불 시뮬레이션이 진행한 가상 시간의 합계(sec).',
    '[물리 진행 배율] 누적 물리 진행 시간을 누적 프레임 간격으로 나눈 값. 1이면 실제 시간과 같은 속도, 1보다 작으면 더 느리게 진행한 것입니다.',
    '[베개 bake 재생] 저장된 높이·회전의 시간 보간에 걸린 시간(ms). 실시간 물리 계산은 수행하지 않습니다. 이후 베개 오브젝트 자세 반영은 기타 갱신에 포함합니다.',
    '[이불 물리 계산] 설정의 duvetMode=baked이면 기록 좌표 보간 시간이며 물리 풀이가 아닙니다. live이면 이불의 고정 스텝 적산, 위치 적분, 제약 조건 반복, 평활화와 충돌 처리에 걸린 시간(ms). 렌더 메시 갱신은 제외합니다.',
    '[이불 메시 변형 (렌더 노멀 제외)] 프록시 노멀·좌표계 계산, 바인딩 정점 보간, 렌더 정점 버퍼 기록에 걸린 시간(ms). 렌더 메시의 노멀 재계산은 제외합니다.',
    '[이불 렌더 노멀 계산] 변형된 렌더 메시의 computeVertexNormals 호출에 걸린 시간(ms). 프록시 노멀 계산은 메시 변형에 포함합니다.',
    '[기타 갱신·계측 오버헤드] 전체 물리·메시 갱신 시간에서 위 네 구간을 뺀 나머지(ms). 베개 자세·충돌체 반영, 디버그 갱신과 구간 사이 계측 비용 등을 포함합니다.',
    '[평균 / 최대 / 누적] 각 분리 구간의 프레임당 평균, 한 프레임의 최댓값, 전체 합계(ms). 평균은 물리 스텝이 0인 프레임도 포함합니다. 생성자·reset의 초기 메시 갱신은 제외하며, 구간별 최대는 서로 다른 프레임일 수 있어 합산하지 않습니다.',
    '[GC 시간] 측정 불가. 브라우저 표준 API로 별도 GC 시간을 얻을 수 없습니다. 각 구간의 경과 시간에는 GC·스케줄링 지연이 포함될 수 있으며, GC를 분리하려면 DevTools Performance 기록이 필요합니다.',
  ];
  completed.forEach((run) => {
    lines.push(
      '',
      '설정: ' + [...run.configurations].join(' → '),
      '측정 프레임 수: ' + run.frames,
      '최저 FPS: ' + (1 / run.maxFrame).toFixed(2),
      '최대 프레임 간격 (sec): ' + run.maxFrame.toFixed(6),
      '프레임당 물리 진행 시간 (sec): ' + run.minPhysics.toFixed(6),
      '최대 물리·메시 갱신 CPU 시간 (ms): ' + run.maxCpu.toFixed(3),
      '최초 mesh 표시 (ms): ' + duration(run.initialMs),
      '최대 옵션 갱신 시간 (ms): ' + duration(run.maxUpdateMs),
      '누적 프레임 간격 (sec): ' + run.wall.toFixed(6),
      '누적 물리 진행 시간 (sec): ' + run.physics.toFixed(6),
      '물리 진행 배율 (물리 시간 / 실제 시간): ' +
        (run.physics / run.wall).toFixed(4),
      '',
    );
    run.phases.forEach((phase, i) => {
      lines.push(
        phaseNames[i] +
          ' — 평균 / 최대 / 누적 (ms): ' +
          (phase.total / run.frames).toFixed(3) +
          ' / ' +
          phase.max.toFixed(3) +
          ' / ' +
          phase.total.toFixed(3),
      );
    });
  });
  return lines.join('\r\n');
}
export function saveRoomMeasurements() {
  if (!completed.length) return;
  const url = URL.createObjectURL(
    new Blob(['\ufeff' + formatRoomMeasurements()], {
      type: 'text/plain;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download =
    'room-metrics-' + new Date().toISOString().replaceAll(':', '-') + '.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const roomPerformance = {
  resetRecording: () => {
    active = null;
    completed.length = 0;
    roomPerformance.publish({ completedRuns: 0 });
  },
  beginSimulation: () => {
    active = {
      phases: phaseNames.map(() => ({ total: 0, max: 0 })),
      configurations: new Set(),
      frames: 0,
      wall: 0,
      physics: 0,
      maxFrame: 0,
      minPhysics: Infinity,
      maxPhysics: 0,
      maxCpu: 0,
      initialMs: snapshot.initialMs,
      maxUpdateMs: null,
    };
  },
  recordFrame: (
    key: string,
    wall: number,
    physics: number,
    cpu: number,
    finished: boolean,
    pillowMs = 0,
    duvet?: { solverMs: number; meshMs: number; normalsMs: number },
  ) => {
    if (!active) return;
    // A zero-substep frame alone is not proof that the solver has finished.
    if (finished && physics === 0) {
      if (active.frames) completed.push(active);
      active = null;
      roomPerformance.publish({ completedRuns: completed.length });
      return;
    }
    if (document.hidden || wall <= 0) return;
    active.configurations.add(key);
    active.frames++;
    active.wall += wall;
    active.physics += physics;
    active.maxFrame = Math.max(active.maxFrame, wall);
    active.minPhysics = Math.min(active.minPhysics, physics);
    active.maxPhysics = Math.max(active.maxPhysics, physics);
    active.maxCpu = Math.max(active.maxCpu, cpu);
    const solver = duvet?.solverMs ?? 0;
    const mesh = duvet?.meshMs ?? 0;
    const normals = duvet?.normalsMs ?? 0;
    // Reuse counters: avoid allocating a per-frame sample array.
    addPhase(active.phases[0], pillowMs);
    addPhase(active.phases[1], solver);
    addPhase(active.phases[2], mesh);
    addPhase(active.phases[3], normals);
    addPhase(
      active.phases[4],
      Math.max(0, cpu - pillowMs - solver - mesh - normals),
    );
  },
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  publish: (values: Partial<RoomMetrics>) => {
    if (active) {
      if (values.initialMs != null) active.initialMs = values.initialMs;
      if (values.updateMs != null)
        active.maxUpdateMs = Math.max(active.maxUpdateMs ?? 0, values.updateMs);
    }
    snapshot = { ...snapshot, ...values };
    listeners.forEach((listener) => listener());
  },
};
