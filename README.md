# clip — 개인정보 유출 72시간 대응 서류 검수

Upstage AI Agent Hackathon v.2 · 팀 clip

내부 사고 경위서 · 고객 통지문 · 개인정보위 신고서를 한 PDF로 올리면, Upstage Studio 워크플로우가 **72시간 기한(통지·신고), 신고 대상 여부, 통지문 필수 6항목, 서류 간 인원·항목 일치**를 검사해 `적정 / 보완필요 / 검토필요`로 1차 판정합니다. 이 웹앱은 그 결과를 근거와 함께 보여 주고, 판정별 후속 문서(검수 확인서 / 보완 요청서 / 담당자 확인 요청서)를 바로 복사·다운로드할 수 있게 합니다. 기준은 2026.9.11 시행 개정 개인정보보호법(제34조, 시행령 제39·40조)입니다.

## 화면

| 블록 | 내용 |
|---|---|
| 1. 업로드 | 서류 묶음 PDF 드롭존(여러 건 동시) + 처리 단계 표시(읽기 → 분류 → 추출 → 검증 → 판정 → 후속 문서) |
| 2. 판정 카드 | 판정 배지 · 신고 대상 근거 · 72시간 타임라인(통지/신고) · 통지문 필수 6항목 체크 · 서류 간 대조표 · 판정 근거 · 원문 JSON |
| 3. 후속 문서 | 판정별 문서 본문 · 복사 / TXT / Word(.docx) / 메일로 보내기 |
| 4. 케이스 목록 | 처리한 사고 목록 · 결과 JSON 내보내기(정답지와 같은 5개 키) |

## 구조

```
브라우저 (React 19, Next.js 16, Tailwind 4)
   │  POST /api/review          PDF 업로드 → Upstage 파일 업로드 → Job 생성 → job id 반환
   │  GET  /api/review/{id}     Job 상태 폴링 → completed 이면 결과 정규화해서 반환
   ▼
Next.js Route Handler (서버) ──→ Upstage Studio Agent API (https://api.upstage.ai/v2, OpenAI 호환)
      · API 키는 서버 환경변수 UPSTAGE_API_KEY 에만 둔다 (브라우저 노출 없음)
      · 업로드/생성과 폴링을 두 요청으로 나눠 서버리스 실행 시간 제한을 피한다
```

```
src/
  app/page.tsx                 화면 (업로드 → 폴링 → 카드)
  app/api/review/route.ts      POST 업로드+Job 생성 / GET 실행 모드
  app/api/review/[id]/route.ts GET Job 상태·결과
  components/                  Header · UploadZone · StepProgress · DecisionCard · Timeline72 · FollowupDoc · CaseList
  lib/upstage.ts               Upstage API 호출 (서버 전용)
  lib/normalize.ts             응답 JSON → 화면용 결과 (모양이 달라도 키 조합으로 찾아냄)
  lib/time.ts                  'YYYY-MM-DD HH:MM' 경과시간 계산 (72시간 정각은 통과)
  lib/mock.ts                  샘플 결과 (API 키 없이 화면 작업·데모)
  lib/docx.ts                  후속 문서 → Word 파일
scripts/test-normalize.ts      정규화·시간 계산 테스트 (npm test)
```

## 실행

```bash
npm install
cp .env.example .env.local      # UPSTAGE_API_KEY 입력 (없으면 샘플 모드로 동작)
npm run dev                     # http://localhost:3000
```

| 환경변수 | 설명 | 기본값 |
|---|---|---|
| `UPSTAGE_API_KEY` | Upstage API 키. **코드·커밋·대화에 절대 넣지 않는다** | (없으면 샘플 모드) |
| `UPSTAGE_AGENT_ID` | Studio 워크플로우(에이전트) ID | `agt_dYaUgJFxXSDceXaB8VcYH2` |
| `UPSTAGE_CONFIG_ID` | 제출한 워크플로우 설정 버전 | `6` |
| `MOCK_MODE` | `1`이면 키가 있어도 샘플 결과만 사용 | 비움 |

- **샘플 모드**: 파일 이름에 `set01·set05·set06·set07·set10`(또는 `C01…`)이 들어 있으면 해당 케이스의 결과를 보여 줍니다. 값은 팀 데이터셋을 설정 #5 워크플로우로 실제 돌린 결과를 바탕으로 했습니다.
- `npm test` — 정규화·시간 계산 테스트, `npm run lint`, `npm run build`

## Upstage API 호출 흐름 (`src/lib/upstage.ts`)

1. `POST /v2/files` (multipart, `purpose=user_data`) → `file_id`
2. `POST /v2/responses` `{ model: <agent id>, input: [{ role:"user", content:[{ type:"input_file", file_id }] }], include:["all"], config_id:"6" }` → `{ id, status }`
3. `GET /v2/responses/{id}?include[]=all` 을 2.5초 간격으로 폴링 → `status: completed`
4. `output_text`(없으면 `output[].content[].text`)를 JSON으로 파싱 → `{ case_id, decision, report_required, missing_items, reason, document_title, document_lines }`

설정 #5부터는 마지막 노드(후속 문서)도 판정 5키를 그대로 복사한 JSON을 내므로 `include:["last"]`로 받아도 같은 값이 나옵니다. `include:["all"]`이면 단계별 추출값(경위서·통지문·신고서)이 함께 와서 타임라인·체크리스트·대조표를 그립니다. `lib/normalize.ts`는 응답 구조에 의존하지 않고 키 조합(`recognized_at`, `notified_at`+`has_legal_rights`, `reported_at`+`report_target`, `decision`+`reason`)으로 객체를 찾기 때문에 응답 모양이 바뀌어도 화면이 깨지지 않습니다.

## 배포 (Vercel)

1. GitHub에 올린 뒤 Vercel에서 Import
2. Environment Variables에 `UPSTAGE_API_KEY`(필수), 필요하면 `UPSTAGE_CONFIG_ID` 추가
3. 배포. 업로드 요청 본문 한도(Vercel 4.5MB)보다 큰 PDF는 올릴 수 없으니 서류 묶음은 그 아래로 유지

## 판정 규칙 요약 (워크플로우 쪽)

- 기준점 T0 = 경위서의 **최초 인지** 시각. 통지 T1, 신고 T2 와의 차이를 시간으로 계산하고 72시간 정각은 통과.
- 신고 대상 = 유출 인원 1천 명 이상 ∨ 민감·고유식별정보 포함 ∨ 외부 불법 접근.
- 판정 순서: **검토필요**(경위서 없음 / 인지 시각 없음·모호 / 서류 간 인원·항목·인지 시각 불일치 / 판독 불가) → **보완필요**(통지·신고 72시간 초과 / 통지문 없음 / 신고 대상인데 신고서 없음 / 통지문 필수 6항목 누락) → **적정**.
- `missing_items` 고정 어휘: 내부 사고 경위서, 고객 통지문, 개인정보위 신고서, 유출 항목, 유출 시점과 경위, 피해 최소화 방법, 대응조치 및 구제절차, 담당부서 연락처, 법적 권리 안내.
- 모든 후속 문서 끝: "본 결과는 1차 검수이며 최종 판단은 개인정보 보호책임자(CPO)가 합니다."
