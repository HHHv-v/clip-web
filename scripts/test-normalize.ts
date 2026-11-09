// 정규화 테스트: npm test
import assert from "node:assert/strict";
import { normalize, timesFromReason, tryParseJson } from "../src/lib/normalize";
import { hoursBetween } from "../src/lib/time";
import { splitSections } from "../src/lib/followup";

// 1) 설정 #5 — 후속 문서 노드가 낸 JSON (output_text)
const followup = JSON.stringify({
  case_id: "C05", decision: "보완필요", report_required: true, missing_items: [], reason: "인지 시각은 2026-10-20 10:00이고 통지 시각은 2026-10-23 19:00이므로 81시간",
  document_title: "보완 요청서", document_lines: ["a", "b"],
});
const r1 = normalize("```json\n" + followup + "\n```", { output: [] });
assert.ok(r1);
assert.equal(r1.judgment.decision, "보완필요");
assert.equal(r1.document?.document_lines.length, 2);
assert.equal(r1.source, "followup");
// 추출값이 없으니 reason 에서 시각을 읽는다
assert.equal(r1.timeline.hoursToNotice, 81);
assert.equal(r1.timelineFromReason, true);

// 2) Studio 실행 결과 모양 (steps → splitResults → extractedData.output) + 인용 마커
const raw = {
  steps: [
    { type: "extract", name: "경위서_추출", splitResults: [{ extractedData: { output: { recognized_at: "2026-10-20 09:00", recognition_ambiguous: false, leaked_count: 2300, leaked_items: ["성명", "이메일"], external_access: true } } }] },
    { type: "extract", name: "통지문_추출", splitResults: [{ extractedData: { output: { notified_at: "2026-10-21 15:00", has_legal_rights: true, has_items: true, leaked_count: 2300, leaked_items: ["성명", "이메일"] } } }] },
    { type: "extract", name: "신고서_추출", splitResults: [{ extractedData: { output: { reported_at: "2026-10-21 15:00", report_target: "개인정보보호위원회", leaked_count: 2300, leaked_items: ["이메일", "성명"] } } }] },
    { type: "instruct", name: "검수_판정", splitResults: [{ content: '{"case_id":"C01","decision":"적정","report_required":true,"missing_items":[],"reason":"ok【†3】"}' }], metadata: { enum: "적정" } },
  ],
};
const r2 = normalize(undefined, raw);
assert.ok(r2);
assert.equal(r2.judgment.case_id, "C01");
assert.equal(r2.judgment.reason, "ok");
assert.equal(r2.timeline.hoursToNotice, 30);
assert.equal(r2.timeline.hoursToReport, 30);
assert.equal(r2.extracts.notices.length, 1);
assert.equal(r2.source, "unknown"); // output_text 없이 raw 에서만 찾음

// 3) 인지 시각 모호 → 기준점 없음
const r3 = normalize(JSON.stringify({ case_id: "C10", decision: "검토필요", report_required: true, missing_items: [], reason: "x" }), {
  output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ recognized_at: "", recognition_ambiguous: true, detected_at: "2026-10-21 02:10" }) }] }],
});
assert.ok(r3);
assert.equal(r3.timeline.recognized_at, undefined);
assert.equal(r3.timeline.hoursToNotice, undefined);

// 4) 시간 계산 경계값: 정확히 72시간은 통과(초과 아님)
assert.equal(hoursBetween("2026-10-20 09:00", "2026-10-23 09:00"), 72);
assert.equal(hoursBetween("2026-10-20 09:00", "2026-10-21 15:30"), 30.5);
assert.deepEqual(timesFromReason("인지 시각 T0는 2026-10-12 14:30, 통지 시각 T1은 2026-10-14 10:00, 신고 시각 T2는 2026-10-13 18:00"), {
  recognized_at: "2026-10-12 14:30", notified_at: "2026-10-14 10:00", reported_at: "2026-10-13 18:00",
});
assert.deepEqual(tryParseJson("설명: {\"a\":1} 끝"), { a: 1 });
// 5) 설정 #24 모양 — 판정이 두 번 감싼 JSON 문자열, leaked_items 가 쉼표 문자열, 신고서에 report_target 없음
const msg = (model: string, text: string) => ({ type: "message", model, content: [{ type: "output_text", text }] });
const judged = { case_id: "NAM-15", decision: "적정", report_required: true, missing_items: [], reason: "ok", document_title: "검수 확인서", document_lines: ["사고 개요"] };
const raw24 = {
  status: "completed",
  output: [
    msg("Information Extract - 경위서_추출", JSON.stringify({ recognized_at: "2026-10-27 14:00", recognition_ambiguous: false, leaked_count: 2600, leaked_items: "이름, 아이디, 주문 내역" })),
    msg("Information Extract - 통지문_추출", JSON.stringify({ notified_at: "2026-10-28 15:00", notice_channel: "이메일", leaked_count: 2600, leaked_items: "이름, 아이디, 주문 내역", has_legal_rights: true })),
    msg("Information Extract - 신고서_추출", JSON.stringify({ reported_at: "2026-10-28 10:00", leaked_count: 2600, leaked_items: "이름, 아이디, 주문 내역", has_contact: true, cpo_name: "강도율" })),
    msg("Validate - 경위서_기준값검증", JSON.stringify("green")),
    { type: "message", content: [{ type: "output_text", text: "x", additional_values: JSON.stringify({ notified_at: { _value: "2026-10-28 15:00" }, notice_channel: { _value: "이메일" } }) }] },
    msg("Instruct - 검수확인서_작성", JSON.stringify(JSON.stringify(judged))),
  ],
};
const r5 = normalize(undefined, raw24);
assert.ok(r5);
assert.equal(r5.judgment.decision, "적정");
assert.equal(r5.document?.document_title, "검수 확인서");
assert.deepEqual(r5.extracts.incident?.leaked_items, ["이름", "아이디", "주문 내역"]);
assert.equal(r5.extracts.breach?.cpo_name, "강도율");
assert.equal(r5.extracts.notices.length, 1); // additional_values 는 무시
assert.equal(r5.timeline.hoursToNotice, 25);
assert.equal(r5.timeline.hoursToReport, 20);

// 6) 후속 문서 — [문서 n] 으로 나누고, 표·소제목·목록을 구분하고, true 는 '예'로
const secs = splitSections(
  {
    document_title: "제목: 보완 요청",
    document_lines: [
      "[문서 1] 보완 요청서 (담당 부서에 보내는 내부 문서)", "제목: 보완 요청", "1. 검수 판정", "- 신고 대상 여부: true",
      "구분 | 기준 시각 | 실제 시각", "고객 통지 | 10-26 11:00 | 10-27 17:00",
      "[문서 2] 수정 통지문 초안 (고객에게 다시 보낼 안내문)", "3. 고객님이 피해를 줄이기 위해 하실 수 있는 조치", "[추가] 이름",
    ],
  },
  "보완 요청서",
);
assert.equal(secs.length, 2);
assert.equal(secs[0].title, "보완 요청");
assert.deepEqual(secs[0].blocks.map((b) => b.type), ["heading", "bullets", "table"]);
assert.ok(JSON.stringify(secs[0].blocks).includes("신고 대상 여부: 예"));
assert.equal(secs[1].audience, "고객에게 다시 보낼 안내문");
assert.equal(secs[1].blocks[0].type, "heading");

console.log("normalize 테스트 통과 ✓");
