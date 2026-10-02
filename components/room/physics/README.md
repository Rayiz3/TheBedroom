# Room physics

- `duvet/settings.ts`: 이불 조절값 (기존 값 유지)
- `duvet/duvet-physics.ts`: Verlet/XPBD 적분, 제약 해결, 충격과 리셋
- `duvet/constraints.ts`: 인접 정점, 경계 가중치, 늘어남·휘어짐 제약 생성
- `duvet/types.ts`: GLB/시뮬레이션 바인딩 데이터 형식
- `duvet/vertex-mapping.ts`: GLB 정점과 바인딩 좌표 연결 및 미세 오차 허용
- `duvet/mesh-binding.ts`: 재사용 버퍼로 렌더 메시·노멀 갱신
- `collision/bed-surface.ts`: 높이 조회, 충돌 투영·마찰 처리
- `collision/mesh-contact-surface.ts`: 삼각형 검색 트리, 거리 조회, collider 표시
- `pillow/settings.ts`: 베개 질량·충격·회전·반발 조절값
- `pillow/runtime.ts`: Rapier 비동기 초기화
- `pillow/bodies.ts`: 강체와 질량·관성 생성
- `pillow/dynamics.ts`: 복원력, 회전 제한, 착지 반동, 정착
- `pillow/pillow-physics.ts`: 물리 월드 수명·step·impulse 인터페이스
- `utils/time-step.ts`: 두 시뮬레이터의 공통 프레임 시간 제한
- `utils/random.ts`: 파라미터화한 원형 범위 내 정규분포 샘플링

이불(1/60초)과 베개(1/120초)의 적분 방식·마찰·감쇠 의미가 다르므로
solver 자체는 합치지 않습니다. 변경 없이 역할만 분리한 구조입니다.

검증: `node --test tests/duvet-physics.test.mjs tests/physics-refactor.test.mjs`
회귀 테스트의 해시는 분리 전 구현에서 캡처한 수치 궤적입니다.
의도적으로 물리 설정이나 알고리즘을 바꿀 경우 결과를 확인하고 기준도 갱신해야 합니다.
