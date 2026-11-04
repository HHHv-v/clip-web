import type { ReviewResult } from "./types";
import { LIMIT_HOURS, formatHours } from "./time";

/**
 * 워크플로우 판정(적정/보완필요/검토필요)과 추출값을 읽어
 * "적합 / 부적합 / 판단 보류"와 기준별 통과 여부, 보완해야 할 일을 사람 말로 만든다.
 * 판정 자체는 워크플로우가 했고, 여기서는 그 결과를 설명만 한다 (새로 판단하지 않는다).
 */

export type Tone = "ok" | "bad" | "hold";
export type CriterionStatus = "pass" | "fail" | "hold" | "na";

export interface Criterion {
  key: "notice" | "report" | "items" | "consistency";
  label: string;
  status: CriterionStatus;
  detail: string;
}

export interface ActionItem {
  title: string;
  detail?: string;
}

export interface Verdict {
  label: "적합" | "부적합" | "판단 보류";
  tone: Tone;
  headline: string;
  criteria: Criterion[];
  actions: ActionItem[];
}

const NOTICE_ITEMS = ["유출 항목", "유출 시점과 경위", "피해 최소화 방법", "대응조치 및 구제절차", "담당부서 연락처", "법적 권리 안내"];
const NOTICE_FLAG: Record<string, keyof NonNullable<ReviewResult["extracts"]["notices"][number]>> = {
  "유출 항목": "has_items",
  "유출 시점과 경위": "has_timeline",
  "피해 최소화 방법": "has_self_protection",
  "대응조치 및 구제절차": "has_response",
  "담당부서 연락처": "has_contact",
  "법적 권리 안내": "has_legal_rights",
};

const fmtCount = (n?: number) => (n === undefined || n === 0 ? "없음" : `${n.toLocaleString("ko-KR")}명`);

function sameItems(a?: string[], b?: string[]) {
  if (!a?.length || !b?.length) return true;
  const norm = (x: string[]) => [...new Set(x.map((s) => s.replace(/\s/g, "")))].sort().join("|");
  return norm(a) === norm(b);
}

export function buildVerdict(r: ReviewResult): Verdict {
  const { judgment: j, extracts: ex, timeline: t } = r;
  const missing = new Set(j.missing_items);
  const hasNotice = ex.notices.length > 0 || !!t.notified_at;
  const hasBreach = !!ex.breach || !!t.reported_at;
  const t0 = t.recognized_at;
  const ambiguous = !!ex.incident?.recognition_ambiguous || (!!ex.incident && !ex.incident.recognized_at);
  const criteria: Criterion[] = [];
  const actions: ActionItem[] = [];

  // ① 고객 통지 72시간
  if (!hasNotice || missing.has("고객 통지문")) {
    criteria.push({ key: "notice", label: "통지 72시간", status: "fail", detail: "통지문이 서류 묶음에 없음" });
    actions.push({
      title: "고객 통지문을 작성해 발송하고, 발송 기록을 묶음에 넣으세요.",
      detail: "통지는 유출 인원이 1명이라도 의무입니다. 발송 일시·채널(이메일·문자·홈페이지)이 서류에 남아야 72시간을 셀 수 있습니다.",
    });
  } else if (!t0) {
    criteria.push({ key: "notice", label: "통지 72시간", status: "hold", detail: "기준점(최초 인지)이 확정되지 않아 계산 보류" });
  } else if (t.hoursToNotice !== undefined && t.hoursToNotice > LIMIT_HOURS) {
    const over = formatHours(Math.round((t.hoursToNotice - LIMIT_HOURS) * 10) / 10);
    criteria.push({ key: "notice", label: "통지 72시간", status: "fail", detail: `${formatHours(t.hoursToNotice)} — ${over} 초과` });
    actions.push({
      title: `고객 통지가 인지 후 ${formatHours(t.hoursToNotice)}에 이뤄져 72시간을 ${over} 넘겼습니다.`,
      detail: "지연 사유(긴급조치, 접속경로 차단·취약점 보완, 수사기관 요청 등)가 있으면 경위서에 사유와 조치 완료 시각을 기재하세요. 없으면 지연 경위 소명 문서를 준비해야 합니다.",
    });
  } else {
    criteria.push({ key: "notice", label: "통지 72시간", status: "pass", detail: `${formatHours(t.hoursToNotice)} (72시간 이내)` });
  }

  // ② 개인정보위 신고
  if (!j.report_required) {
    criteria.push({ key: "report", label: "신고 72시간", status: "na", detail: "신고 대상 아님 — 1천 명 미만·일반 정보·내부 실수" });
  } else if (!hasBreach || missing.has("개인정보위 신고서")) {
    criteria.push({ key: "report", label: "신고 72시간", status: "fail", detail: "신고 대상인데 신고서 없음" });
    actions.push({
      title: "개인정보보호위원회에 유출 신고서를 제출하고 접수증을 묶음에 넣으세요.",
      detail: reportWhy(r) + " 인지 후 72시간 안에 신고해야 하며, 늦으면 지연 사유를 함께 적습니다.",
    });
  } else if (!t0) {
    criteria.push({ key: "report", label: "신고 72시간", status: "hold", detail: "기준점(최초 인지)이 확정되지 않아 계산 보류" });
  } else if (t.hoursToReport !== undefined && t.hoursToReport > LIMIT_HOURS) {
    const over = formatHours(Math.round((t.hoursToReport - LIMIT_HOURS) * 10) / 10);
    criteria.push({ key: "report", label: "신고 72시간", status: "fail", detail: `${formatHours(t.hoursToReport)} — ${over} 초과` });
    actions.push({
      title: `개인정보위 신고가 인지 후 ${formatHours(t.hoursToReport)}에 이뤄져 72시간을 ${over} 넘겼습니다.`,
      detail: "지연 사유를 신고서 또는 경위서에 기재하고, 사유가 없으면 소명 문서를 준비하세요.",
    });
  } else {
    criteria.push({ key: "report", label: "신고 72시간", status: "pass", detail: `${formatHours(t.hoursToReport)} (72시간 이내) · ${reportWhy(r)}` });
  }

  // ③ 통지문 필수 6항목
  if (!hasNotice) {
    criteria.push({ key: "items", label: "통지문 6항목", status: "fail", detail: "통지문이 없어 확인 불가" });
  } else {
    const lacking = NOTICE_ITEMS.filter((item) => {
      if (missing.has(item)) return true;
      const flag = NOTICE_FLAG[item];
      return ex.notices.length > 0 && ex.notices.every((n) => n[flag] === false);
    });
    if (lacking.length) {
      criteria.push({ key: "items", label: "통지문 6항목", status: "fail", detail: `누락: ${lacking.join(", ")}` });
      for (const item of lacking) {
        actions.push({
          title: `통지문에 '${item}' 항목을 추가해 재통지(추가 통지)하세요.`,
          detail:
            item === "법적 권리 안내"
              ? "2026.9.11 시행 개정법에서 새로 필수가 된 항목입니다. 손해배상 청구, 법정손해배상 청구, 개인정보 분쟁조정 신청 방법을 안내하면 됩니다."
              : undefined,
        });
      }
    } else {
      criteria.push({ key: "items", label: "통지문 6항목", status: "pass", detail: "유출 항목 · 시점과 경위 · 피해 최소화 · 대응조치 · 연락처 · 법적 권리 모두 확인" });
    }
  }

  // ④ 서류 간 일치 · 기준점
  const counts = [ex.incident?.leaked_count, ex.notices[0]?.leaked_count, ex.breach?.leaked_count].filter(
    (c): c is number => typeof c === "number" && c > 0,
  );
  const countMismatch = new Set(counts).size > 1;
  const itemsMismatch =
    !sameItems(ex.incident?.leaked_items, ex.breach?.leaked_items) || !sameItems(ex.incident?.leaked_items, ex.notices[0]?.leaked_items);
  if (!ex.incident || missing.has("내부 사고 경위서")) {
    criteria.push({ key: "consistency", label: "서류 일치·기준점", status: ex.incident ? "hold" : "fail", detail: "내부 사고 경위서가 없어 기준점과 대조 불가" });
    actions.push({ title: "내부 사고 경위서를 작성해 묶음에 넣으세요.", detail: "'최초 인지 일시', 유출 인원, 유출 항목, 인지 경로가 꼭 들어가야 합니다. 72시간의 기준점이 여기서 나옵니다." });
  } else if (ambiguous) {
    const d = ex.incident.detected_at || "—";
    const c = ex.incident.confirmed_at || "—";
    criteria.push({ key: "consistency", label: "서류 일치·기준점", status: "hold", detail: "'최초 인지 일시'가 명시되지 않음 (탐지·확인 시각만 있음)" });
    actions.push({
      title: "경위서에 '최초 인지 일시'를 하나로 확정해 기재한 뒤 재검수하세요.",
      detail: `탐지 ${d}과 확인 ${c} 중 어느 시각을 인지 시점으로 볼지 담당자가 정해야 합니다. 검수기는 추측하지 않았습니다.`,
    });
  } else if (countMismatch) {
    criteria.push({
      key: "consistency",
      label: "서류 일치·기준점",
      status: "hold",
      detail: `유출 인원이 서류마다 다름 — 경위서 ${fmtCount(ex.incident.leaked_count)} / 통지문 ${fmtCount(ex.notices[0]?.leaked_count)} / 신고서 ${fmtCount(ex.breach?.leaked_count)}`,
    });
    actions.push({
      title: "유출 인원이 서류마다 다릅니다. 어느 값이 맞는지 확인하고 틀린 서류를 정정하세요.",
      detail: "신고서 값이 틀렸으면 개인정보위에 정정 신고, 통지문이 틀렸으면 추가 통지가 필요합니다.",
    });
  } else if (itemsMismatch) {
    criteria.push({ key: "consistency", label: "서류 일치·기준점", status: "hold", detail: "유출 항목 목록이 서류마다 다름" });
    actions.push({ title: "유출 항목이 서류마다 다릅니다. 실제 유출 항목을 확정하고 서류를 맞추세요." });
  } else {
    criteria.push({ key: "consistency", label: "서류 일치·기준점", status: "pass", detail: `최초 인지 ${t0 ?? "—"} · 인원·항목 일치` });
  }

  // 판정 라벨은 워크플로우 결정값을 따른다
  let label: Verdict["label"];
  let tone: Tone;
  let headline: string;
  if (j.decision === "적정") {
    label = "적합";
    tone = "ok";
    headline = "기한·필수 항목·서류 일치를 모두 충족했습니다. 검수 확인서를 보관하세요.";
  } else if (j.decision === "보완필요") {
    label = "부적합";
    tone = "bad";
    headline = `보완할 것 ${actions.length || 1}가지. 아래 항목을 고친 뒤 다시 올리면 재검수합니다.`;
  } else {
    label = "판단 보류";
    tone = "hold";
    headline = "서류만으로는 확정할 수 없어 담당자 확인이 필요합니다. 검수기는 추측하지 않았습니다.";
  }

  // 워크플로우는 문제라고 했는데 위 규칙으로 잡히지 않은 경우: 판정 근거를 그대로 안내
  if (j.decision !== "적정" && actions.length === 0) {
    actions.push({ title: "판정 근거를 확인하세요.", detail: j.reason });
  }

  return { label, tone, headline, criteria, actions };
}

function reportWhy(r: ReviewResult): string {
  const inc = r.extracts.incident;
  const why: string[] = [];
  if (inc?.leaked_count && inc.leaked_count >= 1000) why.push(`유출 인원 ${inc.leaked_count.toLocaleString("ko-KR")}명`);
  if (inc?.has_sensitive_or_unique_id) why.push("민감·고유식별정보 포함");
  if (inc?.external_access) why.push("외부 불법 접근");
  return why.length ? `신고 대상 (${why.join(", ")})` : "신고 대상";
}
