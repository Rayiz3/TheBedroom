// 질량 kg, 충격량 N·s, 복원 강성 N/m, 선형 감쇠 1/s.
export const PILLOW_IMPULSE_SETTINGS = {
  mass: 0.7,
  impulseY: 0.35,
  returnStiffness: 24,
  linearDamping: 3, // 착지 직전 속도를 남겨 작은 반동 허용
  restitution: 0.4, // 0=반동 없음, 1=착지 속도 그대로 반사
  bounceMinSpeed: 0.06, // m/s: 이보다 느린 착지는 튀지 않고 정착
  maxRise: 0.12,
  angularInertia: 0.025, // kg·m²: 클수록 같은 충격에 덜 회전
  angularStiffness: 1.5, // 원래 자세로 돌아가는 토크 강도
  angularDamping: 10,
  maxTiltDegrees: 4, // 원래 자세 대비 전체 기울기 상한
  // 충격 위치의 X/Z 표준편차(m). 작을수록 기존 중심점에 집중됩니다.
  impulsePointStdDev: 0.045,
  // 중심으로부터 최대 반경(m). 범위 밖은 재추출하여 가장자리 쏠림을 방지합니다.
  impulsePointMaxRadius: 0.2,
};
