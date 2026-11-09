import type { ReviewResult } from "./types";
import { LIMIT_HOURS, formatHours, hasClock, toMinutes } from "./time";

/**
 * 판정 근거를 일반인이 읽을 수 있는 문장으로 바꾼다.
 * 워크플로우 원문(reason)은 칸 이름(recognized_at 등)·계산식이 섞여 있어서,
 * 화면에는 추출값으로 새로 쓴 문장을 먼저 보여 주고 원문은 칸 이름만 한국어로 바꿔 접어 둔다.
 */

export type ExplainTone = "ok" | "bad" | "hold" | "info";
export interface ExplainLine {
  title: string;
  text: string;
  tone: ExplainTone;
}

/** '2026-11-02 16:00' → '11월 2일 16:00', '2026-11-02' → '11월 2일' */
export function koDateTime(value?: string): string {
  if (!value) return "—";
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return value;
  const date = `${+m[2]}월 ${+m[3]}일`;
  return m[4] ? `${date} ${m[4].padStart(2, "0")}:${m[5]}` : date;
}

/** 최초 인지 + 72시간 마감 시각 ('11월 2일 16:00'). 기준점에 시각이 없으면 undefined */
export function deadline72(t0?: string): string | undefined {
  const min = toMinutes(t0);
  if (min === undefined) return undefined;
  const d = new Date((min + LIMIT_HOURS * 60) * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * 통지·신고 기한을 계산할 수 없을 때 그 이유를 한 문장으로. 계산이 되면 undefined.
 * kind: 'notice'(고객 통지) | 'report'(개인정보위 신고)
 */
export function pendingReason(kind: "notice" | "report", r: ReviewResult): string | undefined {
  const t = r.timeline;
  const t0 = t.recognized_at;
  const at = kind === "notice" ? t.notified_at : t.reported_at;
  const what = kind === "notice" ? "고객 통지" : "개인정보위 신고";
  const doc = kind === "notice" ? "통지문" : "신고서";
  if (!at) return undefined;
  if (!t0) return `경위서의 '최초 인지 일시'가 정해지지 않아 ${what}까지 걸린 시간을 셀 수 없습니다.`;
  if (!hasClock(t0)) return `경위서의 '최초 인지 일시'에 날짜(${koDateTime(t0)})만 있고 시각이 없어 72시간을 정확히 셀 수 없습니다.`;
  if (!hasClock(at)) {
    const dl = deadline72(t0);
    return `${doc}에 ${what} 날짜(${koDateTime(at)})만 있고 시각(시·분)이 없어 72시간을 넘었는지 확정할 수 없습니다.${dl ? ` 72시간 마감은 ${dl}입니다.` : ""}`;
  }
  return undefined;
}

/** 판정 근거를 쉬운 문장 여러 줄로 */
export function explainLines(r: ReviewResult): ExplainLine[] {
  const { judgment: j, extracts: ex, timeline: t } = r;
  const lines: ExplainLine[] = [];
  const inc = ex.incident;

  // 1) 기준점
  if (!inc) {
    lines.push({ title: "기준 시각", text: "내부 사고 경위서가 없어 72시간을 세기 시작할 '최초 인지 일시'를 알 수 없습니다.", tone: "bad" });
  } else if (!t.recognized_at) {
    lines.push({ title: "기준 시각", text: "경위서에 '최초 인지 일시'가 적혀 있지 않거나 하나로 정해지지 않았습니다. 담당자가 인지 시점을 정해야 합니다.", tone: "hold" });
  } else {
    lines.push({
      title: "기준 시각",
      text: `사고를 처음 알게 된 때(최초 인지)는 ${koDateTime(t.recognized_at)}입니다.${hasClock(t.recognized_at) ? ` 통지·신고 모두 ${deadline72(t.recognized_at)}까지 해야 합니다.` : ""}`,
      tone: hasClock(t.recognized_at) ? "info" : "hold",
    });
  }

  // 2) 고객 통지
  const hasNotice = ex.notices.length > 0 || !!t.notified_at;
  if (!hasNotice) {
    lines.push({ title: "고객 통지", text: "고객에게 보낸 통지문이 서류 묶음에 없습니다.", tone: "bad" });
  } else {
    const why = pendingReason("notice", r);
    if (why) lines.push({ title: "고객 통지", text: why, tone: "hold" });
    else if (t.hoursToNotice !== undefined)
      lines.push({
        title: "고객 통지",
        text: `${koDateTime(t.notified_at)}에 통지해 인지 후 ${formatHours(t.hoursToNotice)}이 걸렸습니다. ${t.hoursToNotice > LIMIT_HOURS ? "72시간을 넘겼습니다." : "72시간 안에 했습니다."}`,
        tone: t.hoursToNotice > LIMIT_HOURS ? "bad" : "ok",
      });
  }

  // 3) 개인정보위 신고
  const hasBreach = !!ex.breach || !!t.reported_at;
  if (!j.report_required) {
    lines.push({ title: "개인정보위 신고", text: "신고 대상이 아닙니다. 유출 인원이 1천 명 미만이고, 민감·고유식별정보가 없고, 외부 불법 접근도 아닙니다.", tone: "info" });
  } else if (!hasBreach) {
    lines.push({ title: "개인정보위 신고", text: `${reportWhy(r)} 신고서가 서류 묶음에 없습니다.`, tone: "bad" });
  } else {
    const why = pendingReason("report", r);
    if (why) lines.push({ title: "개인정보위 신고", text: `${reportWhy(r)} ${why}`, tone: "hold" });
    else if (t.hoursToReport !== undefined)
      lines.push({
        title: "개인정보위 신고",
        text: `${reportWhy(r)} ${koDateTime(t.reported_at)}에 신고해 인지 후 ${formatHours(t.hoursToReport)}이 걸렸습니다. ${t.hoursToReport > LIMIT_HOURS ? "72시간을 넘겼습니다." : "72시간 안에 했습니다."}`,
        tone: t.hoursToReport > LIMIT_HOURS ? "bad" : "ok",
      });
  }

  // 4) 결론
  const conclusion: Record<string, ExplainLine> = {
    적정: { title: "결론: 적정", text: "기한, 필수 항목, 서류 간 내용이 모두 맞습니다.", tone: "ok" },
    보완필요: { title: "결론: 보완필요", text: "기한을 넘겼거나 빠진 서류·항목이 있어 고쳐서 다시 내야 합니다.", tone: "bad" },
    검토필요: { title: "결론: 검토필요", text: "서류만으로는 확정할 수 없는 부분이 있어 담당자 확인이 필요합니다. 검수기는 추측하지 않았습니다.", tone: "hold" },
  };
  lines.push(conclusion[j.decision] ?? conclusion.검토필요);
  return lines;
}

function reportWhy(r: ReviewResult): string {
  const inc = r.extracts.incident;
  const why: string[] = [];
  if (inc?.leaked_count && inc.leaked_count >= 1000) why.push(`유출 인원 ${inc.leaked_count.toLocaleString("ko-KR")}명`);
  if (inc?.has_sensitive_or_unique_id) why.push("민감·고유식별정보 포함");
  if (inc?.external_access) why.push("외부 불법 접근");
  return why.length ? `${why.join("·")}으로 신고 대상입니다.` : "신고 대상입니다.";
}

const KEY_NAMES: [RegExp, string][] = [
  [/\brecognized_at\b/g, "최초 인지 일시"],
  [/\brecognition_ambiguous\b/g, "인지 시각 모호 여부"],
  [/\bnotified_at\b/g, "통지 일시"],
  [/\breported_at\b/g, "신고 일시"],
  [/\bleaked_at\b/g, "유출 일시"],
  [/\bleaked_count\b/g, "유출 인원"],
  [/\bleaked_items\b/g, "유출 항목"],
  [/\bhas_sensitive_or_unique_id\b/g, "민감·고유식별정보"],
  [/\bexternal_access\b/g, "외부 불법 접근"],
  [/\bhas_items\b/g, "유출 항목 기재"],
  [/\bhas_timeline\b/g, "유출 시점과 경위"],
  [/\bhas_self_protection\b/g, "피해 최소화 방법"],
  [/\bhas_response\b/g, "대응조치"],
  [/\bhas_contact\b/g, "담당부서 연락처"],
  [/\bhas_legal_rights\b/g, "법적 권리 안내"],
  [/\bcpo_name\b/g, "개인정보 보호책임자"],
  [/\breport_required\b/g, "신고 대상 여부"],
  [/\bmissing_items\b/g, "누락 항목"],
  [/\bnotice_channel\b/g, "통지 방법"],
];

/** 워크플로우 원문 근거에서 칸 이름·T0 같은 기호·계산식을 걷어내 읽기 쉽게 */
export function plainReason(reason: string): string {
  let s = reason;
  for (const [re, ko] of KEY_NAMES) s = s.replace(re, ko);
  s = s
    .replace(/\s*\bT[0-2]\b\s*(?=[은는이가을를의])/g, "")
    // '11/1−10/30=2일, 2×24−6=42시간' 같은 계산식은 결과만 남긴다
    .replace(/(?:\d+(?:[/.]\d+)?(?:일|시간)?\s*[−\-–×x*+]\s*)+\d+(?:[/.]\d+)?(?:일|시간)?\s*=\s*/g, "")
    .replace(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/g, (_m, _y, mo, d, h, mi) => `${+mo}월 ${+d}일${h ? ` ${h.padStart(2, "0")}:${mi}` : ""}`)
    .replace(/\s{2,}/g, " ");
  return s.trim();
}
