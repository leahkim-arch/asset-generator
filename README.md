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

### 3. 향후 과제 (예정)

- 모델 추가 (gemini-2.5-flash-image, gpt-5-mini 등)
- 배경 누끼 따기 (투명 PNG 최종 제작)
- 2단계 생성 (Gemini로 생성 → Imagen으로 업스케일)
- 프롬프트 라이브러리 (자주 쓰는 스타일 저장/불러오기)
- 생성 히스토리 저장/관리
- GitHub-Vercel 자동 배포 연동

### 4. 사용 모델 현황

| 용도 | 모델 | API 타입 |
|------|------|---------|
| 이미지 생성 (기본) | `vertex_ai/imagen-4.0-ultra-generate-001` | images/generations |
| 이미지 생성 (선택) | `gemini-3-pro-image-preview` | chat/completions |
| 이미지 생성 (선택) | `gemini-3.1-flash-image-preview` | chat/completions |
| 기획안/스타일 분석 | `gemini-2.5-flash` | chat/completions |

### 5. 해결한 이슈

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
