// 가장자리 처짐 조절: 값을 수정한 뒤 페이지를 새로고침해 낙하를 다시 실행하세요.
// 현재 모습을 유지하는 기본값입니다. 한 번에 조금씩 변경하는 것을 권장합니다.
export const DUVET_DRAPE_SETTINGS = {
  // 클수록 잘 휘어집니다. 시작 범위: 0.000005 ~ 0.00006.
  bendingCompliance: 0.00006,
  // 작을수록 원래 평면 배치로 돌아가려는 힘이 약해져 더 늘어져 덮입니다.
  // 시작 범위: 0 ~ 0.0002. 0은 형태 유지 해제 (뭉침이 생길 수 있음).
  planarShapeRetention: 0.00005,
  // 작을수록 국소적으로 날카롭게 꺾임, 클수록 넓고 완만하게 휘어짐.
  // 시작 범위: 0.02 ~ 0.06; 유효 범위: 0 ~ 1.
  surfaceSmoothing: 0.036,
  // 속도 감쇠율: 클수록 빨리 진정됩니다. 유효 범위: 0 ~ 1.
  velocityDamping: 0.1,
  // 계산을 멈추기까지의 시뮬레이션 시간(초). 천천히 처지면 늘리세요.
  simulationSeconds: 1,
};

// Physics proxy와 침대 collider 사이에 유지할 최소 간격입니다.
// 렌더 이불의 loft 두께는 binding normal offset에서 별도로 복원됩니다.
export const DUVET_COLLISION_RADIUS = 0.052;

// 렌더 두께 방향만 완화합니다. sim 위치와 충돌 간격에는 영향을 주지 않습니다.
export const DUVET_BINDING_NORMAL_SETTINGS = {
  smoothingPasses: 4, // 클수록 더 넓은 이웃까지 두께 방향을 평균냅니다.
  smoothingStrength: 0.6, // 0: 기존 방향, 1: 이웃 평균 방향
};

export const DUVET_PAD_IMPULSE_SETTINGS = {
  velocityY: 7.0, // m/s: 중앙 정점에 추가할 위쪽 속도
  radius: 1.0, // m: 발치 중앙 주변의 영향 반경
  edgeInset: 0.02, // m: 발치 끝에서 안쪽으로 들어온 충격 중심
  maxVelocityY: 10.0, // 연속 선택 시 상승 속도 제한
};
