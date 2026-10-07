// 길이 단위: m. 아래로 향한 광원의 width는 X, height는 Z 방향입니다.
export const CEILING_AREA_LIGHT_SETTINGS = {
  width: 0.7 - 0.01,
  height: 0.3 - 0.01,
  surfaceGap: 0.001, // cube 밑면에서 광원을 아래로 떨어뜨릴 거리
  emissiveScale: 0.4, // LED 표면 발광 강도 = 광원 세기 × 이 값
} as const;

// World-space LED positions, aligned to lamp_ceiling.glb beneath ceiling.glb.
// Kept independent of model loading so physical lights are available immediately.
export const CEILING_AREA_LIGHT_POSITIONS = [
  [0, 2.7189997043237093, 0.00023567676544189453],
  [0, 2.7189997043237093, -0.39976391196250916],
  [0, 2.7189997043237093, 0.40023526549339294],
] as const;
