import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(
  new URL('../components/room/performance.ts', import.meta.url),
  'utf8',
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { roomPerformance: metrics, formatRoomMeasurements } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

void test('phase totals include zero-substep frames, exclude hidden frames and finish only at completion', () => {
  globalThis.document = { hidden: false };
  metrics.resetRecording();
  metrics.beginSimulation();
  metrics.recordFrame('test', 1 / 60, 1 / 60, 10, false, 1, {
    solverMs: 2,
    meshMs: 3,
    normalsMs: 1,
  });
  metrics.recordFrame('test', 1 / 120, 0, 6, false, 1, {
    solverMs: 0,
    meshMs: 3,
    normalsMs: 1,
  });
  assert.equal(metrics.getSnapshot().completedRuns, 0);
  document.hidden = true;
  metrics.recordFrame('hidden', 1, 1, 999, false, 999);
  document.hidden = false;
  metrics.recordFrame('test', 1 / 60, 0, 100, true);
  const report = formatRoomMeasurements();
  assert.equal(metrics.getSnapshot().completedRuns, 1);
  assert.match(report, /측정 프레임 수: 2/);
  assert.match(
    report,
    /이불 물리 계산 — 평균 \/ 최대 \/ 누적 \(ms\): 1\.000 \/ 2\.000 \/ 2\.000/,
  );
  assert.match(report, /이불 메시 변형 .*: 3\.000 \/ 3\.000 \/ 6\.000/);
  assert.match(
    report,
    /기타 갱신·계측 오버헤드 .*: 2\.000 \/ 3\.000 \/ 4\.000/,
  );
  assert.match(report, /\[GC 시간\] 측정 불가/);
  assert.doesNotMatch(report, /설정: .*hidden/);
  metrics.beginSimulation();
  metrics.recordFrame('abandoned', 1, 1, 99, false);
  metrics.beginSimulation();
  metrics.recordFrame('replacement', 1, 1, 1, false);
  metrics.recordFrame('replacement', 1, 0, 0, true);
  assert.doesNotMatch(formatRoomMeasurements(), /설정: abandoned/);
  metrics.resetRecording();
  assert.doesNotMatch(formatRoomMeasurements(), /\[실행 /);
  delete globalThis.document;
});
