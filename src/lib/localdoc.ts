import type { FollowupDocument, ReviewResult } from "./types";
import { buildVerdict } from "./verdict";
import { koDateTime } from "./explain";
import { formatHours } from "./time";

/**
 * 후속 문서를 웹에서 바로 만든다 (15줄 이내).
 * 워크플로우의 후속 문서 단계(AI 작성)는 오래 걸려서, 판정·추출값으로 템플릿 문서를 즉시 만든다.
 * 화면의 판정 근거와 같은 데이터에서 만들기 때문에 내용이 항상 일치한다.
 */

const TITLE: Record<string, string> = {
  적정: "개인정보 유출 대응 서류 검수 확인서",
  보완필요: "개인정보 유출 대응 서류 보완 요청서",
  검토필요: "개인정보 유출 대응 서류 담당자 확인 요청서",
};

export function buildLocalDoc(r: ReviewResult): FollowupDocument {
  const v = buildVerdict(r);
  const { judgment: j, extracts: ex, timeline: t } = r;
  const org = ex.incident?.org_name;
  const lines: string[] = [];

  lines.push(`판정: ${v.label} · 사고번호 ${j.case_id || "—"}${org ? ` · ${org}` : ""}`);

  // 기한 한 줄
  const notice = t.hoursToNotice !== undefined ? `통지 ${formatHours(t.hoursToNotice)}` : t.notified_at ? "통지 계산 불가" : "통지문 없음";
  const report = !j.report_required
    ? "신고 대상 아님"
    : t.hoursToReport !== undefined
      ? `신고 ${formatHours(t.hoursToReport)}`
      : t.reported_at
        ? "신고 계산 불가"
        : "신고서 없음";
  lines.push(`기한: ${notice} · ${report} (최초 인지 ${koDateTime(t.recognized_at)} 기준, 72시간)`);
  lines.push("");

  const problems = v.criteria.filter((c) => c.status === "fail" || c.status === "hold");
  if (problems.length === 0) {
    lines.push("[확인 결과]");
    lines.push("- 통지·신고 모두 72시간 안에 했습니다.");
    lines.push("- 통지문 필수 6항목이 모두 있습니다.");
    lines.push("- 세 서류의 유출 인원·항목이 일치합니다.");
    lines.push("");
    lines.push("[할 일]");
    lines.push("- 이 확인서를 사고 대응 기록과 함께 보관하세요.");
  } else {
    lines.push(v.label === "검토필요" ? "[확인이 필요한 점]" : "[고쳐야 할 점]");
    for (const c of problems.slice(0, 3)) lines.push(`- ${c.label}: ${c.detail}`);
    lines.push("");
    lines.push("[할 일]");
    // 제목이 상황 설명('…넘겼습니다.')이면 할 일이 담긴 detail 을 쓴다
    for (const a of v.actions.slice(0, 3)) lines.push(`- ${/습니다\.$/.test(a.title) && a.detail ? a.detail : a.title}`);
    lines.push("- 고친 서류로 다시 검수해 주세요.");
  }
  lines.push("");
  lines.push("※ 1차 검수 결과이며 최종 판단은 개인정보 보호책임자가 합니다.");

  return { document_title: TITLE[v.label] ?? "검수 결과", document_lines: lines.slice(0, 15) };
}
