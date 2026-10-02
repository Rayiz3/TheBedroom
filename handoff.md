# The Bedroom — 현재 구현 상태 인수인계

이 문서는 현재 워크스페이스에 남아 있는 실제 코드와 에셋을 기준으로 페이지 구성을 정리한다. 구현 과정, 폐기된 시도, 롤백 이력은 포함하지 않는다.

## 1. 실행 환경

- 워크스페이스 루트: `TheBedroom`
- 런타임 요구 사항: Node.js `22.13.0` 이상
- 개발 서버 실행:

  ```bash
  npm install
  npm run dev
  ```

- 주요 명령:
  - `npm run dev`: Vinext 개발 서버 실행
  - `npm run build`: 프로덕션 빌드
  - `npm run lint`: Oxlint 실행
  - `npm run format`: Oxfmt 실행
  - `npm run start`: 빌드 결과를 Wrangler 개발 서버로 실행

주요 기술은 React 19, Vinext, Three.js, React Three Fiber(R3F)이며, 렌더러는 `three/webgpu`의 `WebGPURenderer`를 사용한다.

## 2. 페이지 구성

루트 페이지는 `MaterialViewer` 한 개로 구성된다. 3D 캔버스가 브라우저 화면 전체를 채우며, 오른쪽에는 반투명 설정 패널이 배치된다. 왼쪽 설정 패널은 없다.

- 캔버스 DPR: `1 ~ 1.75`
- WebGPU 렌더러: 안티앨리어싱 사용, 알파 채널 미사용
- 모델 준비 중 표시: `침실 모델을 구성하는 중`
- 화면 하단 조작 안내: `드래그: 공전 · 스크롤: 화각 변경 · 거리: 2 고정`
- 설정 패널:
  - 화면 오른쪽에서 12px 여백 유지
  - 폭 286px
  - 높이 `calc(100vh - 24px)`
  - 내부 세로 스크롤 허용
  - 측면 화살표 버튼으로 가로 방향 접기/펼치기
  - 모바일 폭 680px 이하에서는 10px 외곽 여백과 가용 화면 폭에 맞춰 표시

## 3. 현재 로드되는 장면 에셋

### 사용 중인 모델

| 역할        | 경로                                            |
| ----------- | ----------------------------------------------- |
| 침대        | `/assets/bed.glb`                               |
| 이불        | `/assets/duvet.glb`                             |
| 베개 원본   | `/assets/pillow_lg.glb`                         |
| 환경 이미지 | `/assets/environment/indoor-001-tonemapped.jpg` |

`pillow_lg.glb`는 두 번 복제되어 좌우 베개로 사용된다.

### 저장되어 있지만 현재 장면에서 사용하지 않는 모델

- `/assets/bed_qn.glb`
- `/assets/bed_sg.glb`
- `/assets/pillow_std.glb`

## 4. 모델 배치와 변환

장면의 최상위 침실 그룹은 원점 `(0, 0, 0)`에 있다. Three.js의 Y-up 좌표계를 사용한다.

### 침대

- 위치: `(0, 0, 0)`
- 스케일: `(1.36, 1.2, 1.45)`
- GLB에 포함된 기존 재질을 그대로 사용한다.
- 침대의 모든 메시에는 `castShadow`, `receiveShadow` 플래그가 설정된다.

### 이불

- 렌더 기준 실제 치수: `200 × 230cm`(가로 × 세로)
- 렌더 길이: `1.15`
- 렌더 폭: `1.0` (`1.15 × 200 / 230`)
- X/Z 스케일은 GLB 원본 바운딩 박스 크기를 기준으로 위 렌더 폭과 길이에 맞춘다.
- Y 스케일: `0.79`
- X 위치: 바운딩 박스 중심이 `0`이 되도록 보정
- Y 위치: 스케일이 적용된 침대 상단 높이의 `-0.2배`
- Z 중심: `0.16`
- 현재 장면에서 표시 상태이다.

### 베개

- 원본 GLB를 두 개 복제한다.
- GLB 내부 메시의 위치, 회전, 스케일을 각각 `0`, 단위 쿼터니언, `(1, 1, 1)`로 초기화한 뒤 루트 변환을 적용한다.
- 공통 스케일: `(0.75, 0.67, 0.75)`
- 회전: X축 `π/4`, Y축 `π/2`, Z축 `0`
- 좌우 중심 X: `-0.2`, `+0.2`
- Y 위치: `0`
- Z 중심: `-0.5`
- 각 모델의 바운딩 박스 중심을 기준으로 X/Z 위치를 보정한다.

## 5. 카메라와 사용자 조작

- 초기 카메라 방향 벡터: `(1.62, 0.72, 0.92)`를 정규화한 뒤 반지름 2로 배치
- 초기 FOV: `45°`
- near/far: `0.05 / 100`
- 카메라와 `OrbitControls`의 타깃: 원점 `(0, 0, 0)`
- 팬 이동: 비활성화
- 기본 줌: 비활성화
- 카메라 거리: `minDistance = maxDistance = 2`
- 감쇠: 활성화, `dampingFactor = 0.07`
- 회전 속도: `0.62`
- 자동 공전 속도: `0.72`

마우스 휠은 카메라를 앞뒤로 이동시키지 않고 FOV를 변경한다.

```ts
camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.025, 5, 80);
```

따라서 최대 줌인은 FOV `5°`, 최대 줌아웃은 FOV `80°`이다. 장면 초기화 시 카메라 거리, 방향, 타깃과 FOV가 함께 초기값으로 돌아간다.

## 6. 환경광과 출력 설정

- 환경 텍스처와 배경 모두 `indoor-001-tonemapped.jpg` 사용
- 매핑: `EquirectangularReflectionMapping`
- 색 공간: sRGB
- 톤 매핑: ACES Filmic
- 배경 블러: `0`
- 환경 및 배경 회전: `0`
- 배경 강도: `1`
- 환경광 강도와 노출은 패널에서 조절
- 환경 배경을 끄면 배경색 `#11140f` 사용

## 7. 직물 텍스처 적용 범위

사용자가 선택한 직물 텍스처와 재질 설정은 베개와 이불에만 적용된다. 침대에는 선택한 직물 텍스처를 덮어쓰지 않는다.

텍스처 번들은 다음 순서의 맵 다섯 장으로 구성된다.

1. Color
2. Roughness
3. NormalGL
4. Displacement
5. AmbientOcclusion

Color 맵은 sRGB로 설정하고, 나머지 맵은 데이터 텍스처로 사용한다. 모든 맵은 U/V 방향 `RepeatWrapping`, anisotropy `8`을 사용한다. AO 적용을 위해 UV가 있는 메시에는 동일한 데이터를 사용하는 `uv1` 속성을 추가한다.

## 8. 실제 축척 기반 텍스처 반복

- 촬영한 원단 패치: `9 × 9cm`
- 이불 실물 치수: `200 × 230cm`
- 이불의 이상적인 면 기준 반복 횟수: 약 `22.22 × 25.56`

실제 적용 반복값은 고정 숫자만 쓰지 않고, 최종 변환이 적용된 메시의 UV 밀도를 측정하는 `calculateUvDensityRepeat`로 계산한다. 이렇게 하면 GLB에 작성된 UV와 렌더링 스케일을 반영하면서 원단 한 패치가 렌더 공간에서 9cm에 해당하도록 맞출 수 있다.

- 이불: 최종 이불 메시와 UV 밀도를 기준으로 자동 반복 계산
- 베개: 동일한 9cm 패치 렌더 크기를 사용하되, 베개 자체의 최종 스케일과 UV 밀도로 별도 반복 계산
- 개발용 비교 모드: 이불 U/V 반복을 모두 `20.5`로 적용

베개와 이불은 각각 독립적으로 복제된 텍스처를 사용하므로 서로 다른 반복값을 적용할 수 있다.

## 9. 확률적 타일링

확률적 타일링은 베개와 이불의 Color 맵에만 적용한다. Roughness, Normal, Displacement, AO 맵은 일반적인 반복 샘플링을 유지한다.

구현 방식:

- 같은 Color 맵을 서로 다른 해시 오프셋으로 세 번 샘플링
- UV를 삼각형/simplex 격자로 변환
- 세 인접 셀의 샘플을 barycentric weight로 혼합
- 명도 정보를 반영한 content-aware weight와 gain curve를 사용해 단순 혼합의 흐릿함을 완화
- 명시적 UV derivative를 사용해 셀 경계에서 잘못된 mip level이 선택되는 현상을 완화
- 직물 방향과 실제 반복 축척은 유지하면서 반복 패턴의 격자감을 줄임

확률적 타일링을 끄면 표준 `MeshPhysicalMaterial`과 규칙적인 Color 맵 반복으로 전환된다. 켜면 WebGPU/TSL 기반 `MeshPhysicalNodeMaterial`을 사용한다.

## 10. 오른쪽 설정 패널

환경 및 재질 라벨은 약 1초 동안 호버하면 한글 설명 툴팁을 표시한다. 헤더를 제외한 주요 영문 용어는 한글과 함께 괄호로 병기한다.

### ENVIRONMENT

| 항목                 | 기본값 |    범위 | 기능                               |
| -------------------- | -----: | ------: | ---------------------------------- |
| 노출 (Exposure)      |   3.00 | 0.5–4.0 | 전체 렌더 밝기                     |
| 환경광 (Environment) |   1.50 |   0–2.5 | 물체에 들어오는 환경광과 반사 강도 |

### MATERIAL

| 항목                        | 기본값 |   범위 | 적용 대상  |
| --------------------------- | -----: | -----: | ---------- |
| 거칠기 (Roughness)          |   1.00 |    0–1 | 베개, 이불 |
| 클리어코트 (Clearcoat)      |   0.00 |    0–1 | 베개, 이불 |
| 노멀 강도 (Normal Strength) |   0.85 |    0–2 | 베개, 이불 |
| 변위 (Displacement)         |  0.000 | 0–0.05 | 베개, 이불 |

변위 기본값은 0이다. 실제 변위 품질은 GLB 메시의 세분화 정도에 영향을 받는다.

### 스위치와 초기화

- 환경 배경: 기본 켜짐
- 자동 공전: 기본 꺼짐
- 장면 초기화:
  - 모든 환경/재질 설정을 기본값으로 복원
  - 기본 텍스처 번들로 복원
  - 이불 축척 모드를 자동 축척으로 복원
  - 확률적 타일링을 켬
  - 카메라를 초기 위치, 거리, FOV로 복원

### DEVELOPMENT

- 확률적 타일링 (Stochastic Tiling): `사용 / 사용 안 함`, 기본 `사용`
- 이불 패치 축척 (Duvet Patch Scale):
  - `자동 축척`: 현재 계산된 U/V 반복값 표시
  - `비교값`: `20.5 × 20.5`
- 텍스처 선택 및 새로고침

드롭다운 목록은 아래 방향으로 열리며 불투명 배경, 그림자, 높은 z-index를 사용한다. 이불 패치 축척 드롭다운은 열 때 해당 컨트롤을 패널 중앙 부근으로 스크롤한다.

## 11. 텍스처 번들 검색과 새로고침

텍스처 번들은 `public/textures/<번들명>/` 구조로 저장한다. 현재 폴더는 다음과 같다.

- `Fabric061_4K-JPG`
- `Spatially_bio_2K`
- `Spatially_bio_v2_2K`
- `Spatially_bio_v2ao_2K`
- `Spatially_bio_v3_2K`
- `Spatially_chamonix_2K`

기본 선택은 `Spatially_bio_v2ao_2K`이며, 해당 번들이 없으면 검색 결과의 첫 번째 번들을 사용한다.

한 번들로 인식되려면 폴더 안에 파일명의 끝부분이 다음 패턴인 이미지가 모두 있어야 한다. 확장자는 JPG/JPEG, PNG, WebP를 지원한다.

- `_Color`
- `_Roughness`
- `_NormalGL`
- `_Displacement`
- `_AmbientOcclusion`

Vite 플러그인이 빌드 시 초기 번들 목록을 가상 모듈로 제공한다. 개발 서버에서는 `GET /__texture-bundles`가 현재 폴더를 다시 검색한다. 패널의 새로고침 버튼은 이 API만 호출하므로 `public/textures`에 번들을 추가해도 캔버스와 모델을 처음부터 다시 구성하지 않고 드롭다운 목록만 갱신할 수 있다. 텍스처 폴더의 파일 변경은 Vite 모듈 그래프로 전파하지 않아 전체 페이지 reload를 방지한다.

## 12. 주요 소스 파일

| 파일                             | 역할                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `app/page.tsx`                   | `MaterialViewer`를 렌더링하는 루트 페이지                 |
| `app/layout.tsx`                 | 한국어 문서 설정, Geist 폰트, 메타데이터                  |
| `app/globals.css`                | 전체 화면 레이아웃, 오른쪽 패널, 컨트롤과 드롭다운 스타일 |
| `components/material-viewer.tsx` | WebGPU 장면, 모델 배치, 카메라, 재질, 설정 패널           |
| `components/texture-picker.tsx`  | 텍스처 번들 선택과 개발 서버 새로고침 UI                  |
| `lib/texture-scale.mjs`          | 실물 제품/패치 치수 기반 반복값 계산                      |
| `lib/uv-density.mjs`             | 최종 메시의 UV 밀도 기반 반복값 계산                      |
| `tooling/texture-bundles.mjs`    | 텍스처 폴더 검색, 가상 모듈, 개발용 갱신 API              |
| `vite.config.ts`                 | Vinext, 텍스처 번들, Sites, Cloudflare 플러그인 구성      |
| `types/texture-bundles.d.ts`     | 가상 텍스처 모듈 타입 선언                                |

## 13. 검증 파일

현재 계산 및 번들 검색 로직을 검증하는 테스트 파일이 있다.

- `tests/texture-scale.test.mjs`
- `tests/uv-density.test.mjs`
- `tests/texture-bundles.test.mjs`

전체 페이지 변경 후에는 최소한 다음을 확인한다.

```bash
npm run lint
npm run build
```

WebGPU 렌더링, OrbitControls, FOV 휠 조작, 모델 배치, 드롭다운 방향과 텍스처 새로고침은 실제 브라우저에서 별도로 확인한다.

## 14. Room 침대 콜라이더 불변 조건

침대 하부 콜라이더의 bounding box를 계산할 때 침대 GLB 전체의 bounds를 사용하면 안 된다. 헤드보드 높이와 폭이 하부 몸체 콜라이더에 섞이는 문제가 반복되지 않도록 다음 기준을 반드시 유지한다.

- 하부 몸체 콜라이더 대상은 매트리스 바로 아래의 위쪽 몸체 `Bed_Frame_Base` 하나뿐이다. 더 아래쪽 `Bed_Frame_Recessed_Plinth`에는 collider를 만들지 않는다.
- 싱글 GLB에서 Blender가 붙인 `.001` 같은 숫자 접미사는 허용하되, 이름에서 `head`나 `mattress`를 제외하는 포괄적인 방식으로 대상을 추정하지 않는다.
- `Bed_Headboard_Upright`, `Mattress` 및 전체 bed root의 bounding box는 하부 몸체 콜라이더 계산에 절대 포함하지 않는다.
- 하부 파트가 GLTF 계층에서 다른 파트의 부모일 수 있으므로 `new Box3().setFromObject(mesh)`도 사용하지 않는다. 이 API는 전달한 mesh의 자식까지 재귀적으로 포함하여 헤드보드를 다시 bounds에 끌어들일 수 있다.
- 반드시 각 mesh 자체의 `geometry.boundingBox`를 구한 뒤 그 mesh의 `matrixWorld`만 적용해 world bounds를 계산한다.
- 대상 메시 자체의 bounds로 box collider 하나만 만든다.
- GLB 구조가 바뀌어 `Bed_Frame_Base`를 정확히 하나 찾지 못하면 전체 침대 bounds로 대체하지 말고 명시적인 오류를 발생시켜 모델 이름 변경을 확인한다.

베개 collider는 렌더 베개와 마찬가지로 Three.js Z축을 기준으로 45° 회전된 oriented rounded box여야 한다. 베개 GLB의 기울기는 노드 transform이 아닌 geometry 좌표에 베이크될 수 있으므로 pillow root의 AABB나 quaternion만 복사하지 않는다. 실제 world vertex를 Z축 `+45°`와 `-45°` 좌표계에 투영하고, 부피가 더 작은 tight bounds를 선택해 회전 방향과 크기를 결정한다.

베개 collider의 회전된 로컬 Y 폭은 `components/room/collision-proxies.ts`의 `PILLOW_COLLIDER_Y_SCALE`로 조절한다. 기본값 `0.9`는 tight bounds보다 10% 줄인 크기이며, `1`이면 축소하지 않는다.

Colliders 표시에는 침대/베개 접촉면뿐 아니라 현재 이불 물리 simulation proxy triangle도 분홍색 동적 wireframe으로 함께 표시한다.

이불 physics proxy의 충돌 반경은 `components/room/duvet-physics.ts`의 `DUVET_COLLISION_RADIUS`로 조절한다. 사용자가 설정한 현재 값은 `0.052m`이다. 반경만으로 끝단 말림이 해결된다는 이전 설명은 검증되지 않았으며, binding offset을 반경에 사용하는 것이 항상 두께 중복이라는 설명도 정확하지 않다. 렌더 표면과 proxy의 상대 위치에 따라 필요한 간격이 달라진다.

끝단 말림을 줄이기 위해 simulation triangle에서 한 면에만 속하는 edge를 찾아 자유 경계를 식별한다. 경계와 바로 안쪽 한 줄에서는 높이 평활화 및 X/Z 초기 위치 복원을 적용하지 않는다. 안쪽 2~5번째 이웃 줄에 걸쳐 smoothstep으로 기존 강도를 복원한다. 이 가중치는 `DuvetPhysics.regularizationWeights`에 저장되며, stretch/bending 및 충돌 제약은 가장자리에도 유지한다. 시각적인 말림 해결 여부는 빌드 통과만으로 단정하지 않는다.
