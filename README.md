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

### 3. 이번 주 작업 정리 (2026.03.19 ~ 03.20)

#### 개선 완료

**1. 이미지 생성 모델 대폭 확장 (3개 → 8개)**
* 기존에는 Imagen 4 Ultra, Gemini 3 Pro Image, Gemini 3.1 Flash Image 3개 모델만 사용 가능했다
* 각 모델을 직접 API 호출하여 응답 시간과 이미지 생성 여부를 테스트한 후, 실제 동작하는 모델 5개를 추가 선별했다
* 특히 Seedream 5.0(삼성 AI)과 Grok Imagine Pro(xAI)는 별도 LiteLLM 서버(`litellm-snow.io.naver.com`)에서만 접근 가능했기 때문에, API 어댑터에 `apiSource` 개념을 도입하여 모델별로 다른 엔드포인트와 인증키를 자동으로 분기 처리했다
* Seedream은 최소 이미지 크기 제한(3686400px)이 있었고, Grok은 size 파라미터를 지원하지 않는 등 모델마다 API 스펙이 달라서 각각에 맞게 요청 body를 분기 처리했다

| 모델 | 응답 속도 | API 출처 |
|------|---------|---------|
| Seedream 5.0 (삼성 AI) | ~13초 | Snow LiteLLM |
| Grok Imagine Pro (xAI) | ~13초 | Snow LiteLLM |
| Imagen 4 Fast | ~6초 | AAC API |
| GPT Image 1 (OpenAI) | ~12초 | AAC API |
| Gemini 2.5 Flash Image | ~17초 | AAC API |
| Gemini 3.1 Flash Image | ~23초 | AAC API |
| Gemini 3 Pro Image | ~25초 | AAC API |
| Imagen 4 Ultra | ~30초+ | AAC API |

**2. 429 Rate Limit 에러 → 자동 모델 Fallback으로 해결**
* Gemini 3 Pro Image 모델로 에셋 9개를 생성하면, 3~4번째부터 `RESOURCE_EXHAUSTED` (429) 에러가 반복적으로 발생했다
* 처음에는 요청 간 딜레이(2초→3초)를 넣어봤지만 해결되지 않았다. 이 에러는 호출 빈도가 아니라 모델의 시간당 할당량 자체가 소진된 것이기 때문이다
* 그 다음에는 5초→10초→20초로 점점 늘리며 최대 3번 재시도하는 로직을 넣었지만, 할당량이 찬 상태에서는 아무리 기다려도 같은 모델이 돌아오지 않았다
* 최종적으로 **에러 종류와 관계없이 즉시 다음 모델로 전환하는 fallback 체인**을 구현했다. 선택한 모델이 실패하면 나머지 7개 모델을 순차적으로 시도하며, 모델마다 별도 할당량이 있으므로 하나가 막혀도 다른 모델이 받아주는 구조이다
* 8개 모델이 전부 실패해야 비로소 사용자에게 에러를 표시한다

**3. 생성 속도 최적화 (순차 → 병렬)**
* 에셋 9개를 1개씩 순차 생성하면 Gemini Pro 기준 약 4분 30초, 대기 시간 포함 시 15분 이상 걸리는 경우도 있었다
* `Promise.allSettled`를 사용하여 2개씩 동시에 병렬 생성하도록 변경했다. 한 배치 내 하나가 실패해도 다른 에셋에 영향을 주지 않는다
* Imagen 4 Fast(~6초) 선택 시 9개 에셋을 약 30초 내에 생성 가능

**4. 에러 원인 UI 표시 및 타임아웃 추가**
* 기존에는 생성 실패 시 빨간색 "오류" 아이콘만 표시되어 원인을 전혀 알 수 없었다. "왜 에러가 나는지" 확인하려면 브라우저 개발자 도구를 열어야 했다
* `AssetItem` 인터페이스에 `errorMessage` 필드를 추가하고, 에셋 카드에 구체적인 에러 원인(예: `gemini-3-pro-image-preview API failed (429)`, `Failed to fetch`, `요청 시간 초과`)을 작은 글씨로 표시하도록 했다
* 이 에러 메시지 표시를 통해 429 에러가 "호출 간격" 문제가 아니라 "모델 할당량 소진" 문제라는 근본 원인을 빠르게 파악할 수 있었다
* 또한 API 응답이 아예 돌아오지 않아 "생성 중..."에서 무한 대기하는 문제가 있었는데, `AbortController` 기반의 `fetchWithTimeout` 유틸리티를 만들어 이미지 생성 60초, 분석 120초 타임아웃을 적용했다

**5. 에셋 크기 및 배경 품질 개선**
* 생성된 에셋이 720x720 캔버스 면적의 20~30%만 차지하여 너무 작게 보이는 문제가 있었다. 또한 배경이 순백이 아니라 회색 영역이 섞여 이분할되는 경우가 절반 이상이었다
* 프롬프트에 "filling 75% of the canvas" 같은 추상적 표현을 넣었지만 AI가 무시했다. Imagen 계열 모델에는 `"close-up view, fills most of the frame"`처럼 카메라 구도 용어로, Gemini에는 `"almost touch the edges with only a thin margin"` 같은 시각적으로 구체적인 지시로 변경하여 개선했다
* 배경 이분할은 프롬프트에 `"Every single pixel outside the object must be white, NO two-tone background"` 지시를 추가하고, 다운로드 시 Canvas API로 `#FFFFFF` 흰색을 먼저 채운 후 이미지를 그리는 이중 안전장치를 적용했다

**6. 외곽선 설정 반영 강화**
* 스타일 옵션에서 "두꺼운 외곽선"을 선택해도 생성 결과에 전혀 반영되지 않고 얇은 선으로 나왔다
* 원인은 프롬프트에 `"thick outline"`이라는 표현만 전달했기 때문이다. AI 모델에게 이 표현은 너무 약하고 추상적이다
* `outlineToPrompt` 함수를 만들어 `"thick"` → `"bold heavy black marker outline, thick 4px stroke weight"`, `"thin"` → `"thin delicate outline, 1px fine stroke"`처럼 시각적으로 구체적인 표현으로 변환하도록 했다

**7. 기획안 키워드 분석 정확도 개선**
* 기획안 이미지를 넣으면 AI가 자동 분석하여 에셋 키워드를 추출하는데, 기획안에 명시된 키워드(예: "하트, 풍선, 연필꽃이")를 읽어내지 못하고 AI가 임의로 만든 관련 없는 키워드를 우선 생성하는 문제가 있었다
* 분석 시스템 프롬프트를 전면 개편하여, 기획안 이미지의 텍스트를 OCR로 읽어 명시된 키워드를 1순위로 추출하도록 강제했다
* `suggestedItems` 배열 우선순위: 기획안에 적힌 에셋 이름 → 레퍼런스 이미지에 보이는 아이템 → 테마에 맞는 AI 추천 아이템

#### 해결한 버그

1. **API 키 만료로 전체 서비스 중단 (401)** → AAC API 키가 만료되어 이미지 생성과 분석 모두 실패. 새 키로 교체 후 `.env.local` 업데이트, 재빌드, 재배포하여 복구
2. **사내 사이트 로그인 불가** → 재배포 시 Appwrite 환경변수(`VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`, `VITE_APPWRITE_API_KEY`)가 누락됨. 이전 `gh-pages` 커밋에서 설정값을 추출하여 복원
3. **에러 발생해도 "오류"만 표시** → `updateItemStatus` 함수에 `errorMessage` 파라미터 추가, UI에 구체적 에러 원인 표시
4. **"생성 중..." 무한 대기** → API 호출에 타임아웃이 없어서 응답 없으면 영구 대기. `fetchWithTimeout` 60초 타임아웃 적용
5. **429 에러 반복 실패** → 단순 재시도로는 해결 불가능한 할당량 문제. 8개 모델 자동 fallback 체인으로 근본 해결
6. **에셋이 캔버스의 20~30%만 차지** → 프롬프트의 크기 지시를 카메라 구도 용어 등 구체적 표현으로 변경
7. **배경 색상이 이분할** → 프롬프트 강화 + 다운로드 시 Canvas API로 흰색 배경 강제 렌더링
8. **"두꺼운 외곽선" 설정 무시** → AI에게 약한 표현이었던 `"thick outline"`을 `"bold heavy black marker outline, 4px stroke"` 등 구체적 시각 표현으로 변환
9. **기획안 내 요청 키워드 미반영** → 분석 시스템 프롬프트를 OCR 기반 키워드 우선 추출로 전면 개편

#### 향후 개선 예정

1. **에셋 크기/배경 문제 지속 모니터링** - 프롬프트 개선 후 실제로 크기가 70% 이상 나오는지, 배경 이분할이 해결되었는지 다양한 모델에서 추가 검증
2. **Seedream/Grok 모델 품질 평가** - 이번 주에 새로 추가한 모델들의 스티커 에셋 적합성을 집중 테스트. 기존 Gemini 모델 대비 품질 차이 확인
3. **배경 누끼 따기 (투명 PNG)** - 현재는 흰색 배경 위 에셋이지만, 최종 제작물은 배경을 제거한 투명 PNG여야 함. 배경 제거 API 또는 모델 연동 검토
4. **모델별 품질 비교 기능** - 동일 프롬프트로 8개 모델 결과를 나란히 비교할 수 있는 UI 기능 검토

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
