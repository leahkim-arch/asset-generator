# Asset Set Generator

AI 기반 스티커 에셋 자동 생성 사이트

**Live:** https://asset-generator-gold.vercel.app  
**Repo:** https://github.com/leahkim-arch/asset-generator

---

## 바이브 코딩 (Cursor) 제작 히스토리

### 1. 프로젝트 구성

- **(a) 기술 스택**
  - Next.js 16 (App Router) + TypeScript
  - Tailwind CSS + shadcn/ui
  - API 어댑터 패턴 (모델 교체 용이)

- **(b) API 구조**
  - `/api/analyze` — 기획안/레퍼런스 이미지 분석 (Gemini 2.5 Flash)
  - `/api/generate` — 이미지 생성 (모델 선택 가능)

- **(c) 배포**
  - GitHub → Vercel (수동 배포)
  - 환경변수: `AAC_API_BASE_URL`, `AAC_API_KEY`

### 2. 개발 진행 (완료)

- **프로젝트 초기 세팅**
  - Next.js + shadcn/ui 프로젝트 생성
  - 타입 정의, 훅 설계, 컴포넌트 분리
  - 랜딩 페이지 + 에셋 생성 페이지 UI 구현

- **API 모델 연결**
  - 1차: `gemini-3-pro-image-preview` (최초 이미지 생성 모델)
  - 2차: `vertex_ai/imagen-4.0-ultra-generate-001` (품질 향상 목적)
  - 3차: 3개 모델 선택 가능 (Imagen 4 Ultra / Gemini 3 Pro Image / Gemini 3.1 Flash Image)

- **에셋 생성 규칙 6가지 적용**
  - 대지 1개에 에셋 1개만 생성
  - 배경색 선택 UI (블랙/그레이/화이트/블루/옐로우)
  - 720x720 PNG 다운로드 + ZIP 일괄 다운로드
  - 드래그 앤 드롭 파일 업로드
  - 생성 중단 버튼 (AbortController)
  - 기획안 자동 분석 → 스타일 프롬프트 자동 생성

- **프롬프트 최적화**
  - Imagen 400자 제한 대응: 키워드 중심 압축 프롬프트
  - Gemini용 서술형 프롬프트 분리
  - `imagenPromptPrefix` (50~80자 키워드형) Gemini 분석 시 생성
  - `imagenNegativeHints` (스타일 반대 키워드) 자동 생성
  - `negative_prompt` API 파라미터 분리
  - 해상도 2048x2048 생성 → 720x720 다운로드

- **스타일 충실도 개선**
  - `enhance_prompt` 제거 (모델이 스타일을 자의적으로 변경하는 문제)
  - 고정 품질 키워드 (`high detail, professional quality`) 제거
  - 종이/카드/프레임 위 스티커 방지 프롬프트 추가
  - 1:1 정사각형 비율 강제

- **분석 시스템 안정화**
  - `max_tokens` 3000 → 8000 (JSON 잘림 방지)
  - JSON 파싱 실패 시 부분 복구 로직 추가

- **UI/UX 개선**
  - 모델 선택 드롭다운 + "모델" 라벨 표시
  - 아이템/수량 섹션을 스타일 위로 이동
  - Noto Sans KR 폰트 적용 (Safari 대응)
  - AI 분석 상태 배지 (분석 중... / 분석 완료)

- **배포**
  - GitHub 저장소 생성 + 푸시
  - Vercel 프로덕션 배포 완료

### 3. 이번 주 개선 완료 (2026.03.19 ~ 03.20)

#### 신규 모델 추가 (3개 → 8개)
기존 3개 모델에서 5개를 추가하여 총 8개 모델을 사용자가 선택할 수 있게 확장했다.
직접 API를 호출하여 각 모델의 응답 시간과 동작 여부를 테스트한 후 추가했다.

| 모델 | 응답 속도 | API 출처 | 신규 여부 |
|------|---------|---------|----------|
| Seedream 5.0 (삼성 AI) | ~13초 | Snow LiteLLM | **신규** |
| Grok Imagine Pro (xAI) | ~13초 | Snow LiteLLM | **신규** |
| Imagen 4 Fast | ~6초 | AAC API | **신규** |
| GPT Image 1 (OpenAI) | ~12초 | AAC API | **신규** |
| Gemini 2.5 Flash Image | ~17초 | AAC API | **신규** |
| Gemini 3.1 Flash Image | ~23초 | AAC API | 기존 |
| Gemini 3 Pro Image | ~25초 | AAC API | 기존 |
| Imagen 4 Ultra | ~30초+ | AAC API | 기존 |

Seedream과 Grok은 별도 LiteLLM 엔드포인트(`litellm-snow.io.naver.com`)를 사용하기 때문에, API 어댑터에 `apiSource` 개념을 추가하여 모델별로 다른 엔드포인트와 키를 자동으로 사용하도록 구현했다.

#### 429 Rate Limit 자동 복구 (모델 Fallback)
Gemini 모델의 `RESOURCE_EXHAUSTED` (429) 에러가 빈번하게 발생했다.
이는 특정 모델의 분당/시간당 할당량이 소진되는 문제로, 단순 재시도로는 해결되지 않았다.
**해결**: 에러 발생 시 다음 모델로 즉시 자동 전환하는 fallback 체인을 구현했다.
최대 8개 모델을 순차적으로 시도하며, 모든 모델이 실패해야 비로소 에러를 표시한다.
모델마다 별도 할당량을 사용하므로 하나가 막혀도 다른 모델이 받아주는 구조이다.

#### 생성 속도 개선 (병렬 처리)
9개 에셋을 순차(1개씩) 생성하면 Gemini Pro 기준 약 4분 30초가 걸렸다.
**해결**: 2개씩 동시에 병렬 생성하도록 변경했다.
`Promise.allSettled`를 사용하여 한 배치 내 실패가 다른 에셋에 영향을 주지 않도록 했다.
Imagen 4 Fast 모델 선택 시 9개 에셋을 약 30초 내에 생성 가능하다.

#### 에러 가시성 개선
기존에는 생성 실패 시 "오류"만 표시되어 원인을 알 수 없었다.
**해결**: `AssetItem`에 `errorMessage` 필드를 추가하고, 구체적인 에러 원인(예: `429 Rate Limit`, `Failed to fetch`, `요청 시간 초과`)을 에셋 카드에 표시하도록 했다.
콘솔에도 모델명과 아이템명이 포함된 상세 로그를 남긴다.

#### API 타임아웃 추가
응답이 돌아오지 않는 경우 무한 대기하는 문제가 있었다.
**해결**: `fetchWithTimeout` 유틸리티를 만들어 이미지 생성 60초, 분석 120초 타임아웃을 적용했다.
`AbortController`를 사용하며, 타임아웃 시 "요청 시간 초과 (60초)"라는 명확한 에러 메시지를 반환한다.

#### 에셋 크기 개선
생성된 에셋이 720x720 캔버스의 20~30%만 차지하는 문제가 있었다.
**해결**: 프롬프트에 "close-up view, fills most of the frame" (Imagen), "filling 70-80% of the canvas, almost touch the edges" (Gemini) 등 구체적이고 시각적인 크기 지시를 추가했다.

#### 배경 이분할 방지
일부 에셋에서 배경이 순백이 아니라 회색 영역이 섞여 이분할되는 문제가 있었다.
**해결**: 프롬프트에 "Every single pixel outside the object must be white, NO two-tone background" 지시를 추가했다.
추가로, 다운로드 시 Canvas API로 흰색(`#FFFFFF`)을 먼저 채운 후 이미지를 그려서, 모델이 약간의 회색을 넣더라도 최종 PNG는 항상 순백 배경이 되도록 이중 안전장치를 적용했다.

#### 외곽선 설정 강화
"두꺼운 외곽선"을 선택해도 실제 생성 결과에 반영되지 않는 문제가 있었다.
**해결**: `"thick outline"`이라는 추상적 표현 대신, `"bold heavy black marker outline, thick 4px stroke weight"`처럼 시각적으로 구체적인 표현으로 변환하는 `outlineToPrompt` 함수를 추가했다.

#### 기획안 키워드 분석 정확도 개선
기획안(이미지)을 넣었을 때, 기획안에 명시된 에셋 이름(예: 하트, 풍선, 연필꽃이)을 읽어내지 못하고 AI가 임의로 만든 키워드를 우선 생성하는 문제가 있었다.
**해결**: 분석 시스템 프롬프트를 전면 개편하여, 기획안 텍스트에서 OCR한 키워드를 1순위로 추출하도록 강제했다.
`suggestedItems` 배열의 우선순위: 기획안 명시 키워드 → 레퍼런스 이미지에 보이는 아이템 → 테마에 맞는 추천 아이템 순서로 정렬된다.

### 4. 해결한 버그 (이번 주)

| 버그 | 원인 | 해결 |
|------|------|------|
| API 키 만료로 생성 불가 (401) | AAC API 키 `sk-i17S...` 만료 | 새 키 `sk-kOHA...`로 교체, 재빌드/재배포 |
| 사내 사이트 로그인 실패 | Appwrite 환경변수 누락 | `.env.local`에 Appwrite 설정 추가 후 재배포 |
| 생성 중 에러 표시 안 됨 | `updateItemStatus`에 에러 메시지 파라미터 없음 | `errorMessage` 필드 추가 및 UI 표시 |
| "생성 중..." 무한 대기 | API 호출에 타임아웃 없음 | `fetchWithTimeout` 60초 타임아웃 적용 |
| 429 에러로 생성 실패 | 특정 모델 할당량 소진 (RESOURCE_EXHAUSTED) | 8개 모델 자동 fallback 체인 구현 |
| 에셋이 너무 작게 생성됨 | 프롬프트의 크기 지시가 추상적 | "close-up view, 70-80% of canvas" 등 구체적 지시 |
| 배경 색상 이분할 | 모델이 회색 영역 생성 | 프롬프트 강화 + 다운로드 시 흰색 배경 강제 채움 |
| 외곽선 설정 무시됨 | "thick outline"이 AI에게 약한 표현 | 구체적 시각 표현으로 변환 (marker, 4px stroke) |
| 기획안 키워드 미반영 | 분석 프롬프트가 OCR 우선 추출을 강제하지 않음 | 시스템 프롬프트 전면 개편 |

### 5. 이전에 해결한 이슈 (지난주 이전)

| 이슈 | 원인 | 해결 |
|------|------|------|
| Safari 세리프체 | next/font CSS variable 미적용 | className 직접 적용 + preload |
| 생성 이미지 다수 오브젝트 | 프롬프트에 single object 미강제 | 프롬프트 + 네거티브 프롬프트 보강 |
| 격자무늬 배경 | 투명 배경 생성됨 | 단색 흰배경 강제 |
| 레퍼런스 스타일 미반영 | enhance_prompt가 스타일 왜곡 | enhance_prompt 제거 + 품질 키워드 제거 |
| 종이 위 스티커 생성 | "sticker" 키워드 오해석 | 프롬프트에서 sticker 제거, NO paper/card 명시 |
| Gemini 이미지 추출 실패 | message.images 배열 미파싱 | 응답 구조 분석 후 파싱 로직 수정 |
| 분석 JSON 파싱 실패 | max_tokens 부족으로 응답 잘림 | 8000으로 증가 + 부분 복구 로직 |
| 가로형 이미지 생성 | Gemini에 크기 지정 안 됨 | 프롬프트에 SQUARE 1:1 강제 + image_size 파라미터 |

### 6. 사용 모델 현황 (최신)

| 모델 | 속도 | API 엔드포인트 | 용도 |
|------|------|-------------|------|
| Seedream 5.0 | ~13초 | Snow LiteLLM | 이미지 생성 (고품질 스타일) |
| Grok Imagine Pro | ~13초 | Snow LiteLLM | 이미지 생성 (고품질) |
| Imagen 4 Fast | ~6초 | AAC API | 이미지 생성 (최고 속도) |
| GPT Image 1 | ~12초 | AAC API | 이미지 생성 |
| Gemini 2.5 Flash Image | ~17초 | AAC API | 이미지 생성 (안정적) |
| Gemini 3.1 Flash Image | ~23초 | AAC API | 이미지 생성 (최신 Flash) |
| Gemini 3 Pro Image | ~25초 | AAC API | 이미지 생성 (Pro급 품질) |
| Imagen 4 Ultra | ~30초+ | AAC API | 이미지 생성 (최고 품질) |
| Gemini 2.5 Flash (텍스트) | — | AAC API | 기획안/스타일 분석 전용 |

### 7. 향후 개선 예정

- **배경 누끼 따기**: 생성된 에셋의 배경을 제거하여 투명 PNG로 최종 제작
- **2단계 생성**: 빠른 모델로 초안 생성 → 고품질 모델로 업스케일
- **프롬프트 라이브러리**: 자주 쓰는 스타일을 저장하고 불러오는 기능
- **생성 히스토리**: 이전 생성 결과를 저장하고 다시 볼 수 있는 기능
- **모델별 품질 비교 테스트**: 동일 프롬프트로 8개 모델 결과를 나란히 비교하는 기능
- **Seedream/Grok 모델 품질 평가**: 새로 추가된 모델의 스티커 에셋 적합성 집중 테스트
- **에셋 크기/배경 문제 지속 모니터링**: 프롬프트 개선 후 실제 개선 효과 확인

---

## 로컬 개발

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

## 환경변수

`.env.local` 파일에 설정:

```
AAC_API_BASE_URL=https://aac-api.navercorp.com
AAC_API_KEY=your-api-key
```
