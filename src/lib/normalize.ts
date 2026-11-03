import type {
  BreachReportExtract,
  Decision,
  Extracts,
  FollowupDocument,
  IncidentExtract,
  Judgment,
  NoticeExtract,
  ReviewResult,
} from "./types";
import { hoursBetween } from "./time";

const DECISIONS: ReadonlySet<string> = new Set(["적정", "보완필요", "검토필요"]);

/** 코드 블록 기호, Studio 인용 마커(【†n】)를 걷어낸다 */
export function cleanText(s: string): string {
  return s
    .replace(/```(?:json)?/gi, "")
    .replace(/【[^】]*】/g, "")
    .trim();
}

/** 문자열이 JSON이면 파싱. 앞뒤에 설명이 붙어 있으면 첫 '{'부터 마지막 '}'까지 다시 시도 */
export function tryParseJson(s: string): unknown {
  const t = cleanText(s);
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    /* fallthrough */
  }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(t.slice(a, b + 1));
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

interface Found {
  judgments: Obj[];
  incidents: Obj[];
  breaches: Obj[];
  notices: Obj[];
}

/**
 * 응답 JSON을 모양에 상관없이 끝까지 훑으면서, 우리가 아는 키 조합을 가진 객체를 모은다.
 * (include: "all" 응답의 단계별 구조가 바뀌어도 화면이 깨지지 않게 하기 위한 방어)
 */
function walk(node: unknown, found: Found, seen: Set<string>, depth = 0): void {
  if (depth > 40) return;
  if (typeof node === "string") {
    if (node.length > 20 && /[{[]/.test(node)) {
      const parsed = tryParseJson(node);
      if (parsed !== undefined && typeof parsed !== "string") walk(parsed, found, seen, depth + 1);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const n of node) walk(n, found, seen, depth + 1);
    return;
  }
  if (!isObj(node)) return;

  const key = JSON.stringify(node);
  if (!seen.has(key)) {
    seen.add(key);
    if ("decision" in node && "reason" in node && DECISIONS.has(String(node.decision))) {
      found.judgments.push(node);
    }
    if ("recognized_at" in node || "recognition_ambiguous" in node) found.incidents.push(node);
    if ("reported_at" in node && "report_target" in node) found.breaches.push(node);
    if ("notified_at" in node && ("has_legal_rights" in node || "notice_channel" in node)) {
      found.notices.push(node);
    }
  }
  for (const v of Object.values(node)) walk(v, found, seen, depth + 1);
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;
const bool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : undefined;
const num = (v: unknown): number | undefined => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
};
const strArr = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => String(x)) : undefined;

function toJudgment(o: Obj): Judgment {
  return {
    case_id: str(o.case_id) ?? "",
    decision: String(o.decision) as Decision,
    report_required: bool(o.report_required) ?? false,
    missing_items: strArr(o.missing_items) ?? [],
    reason: str(o.reason) ?? "",
  };
}

function toDocument(o: Obj): FollowupDocument | undefined {
  const lines = strArr(o.document_lines);
  if (!lines) return undefined;
  return { document_title: str(o.document_title) ?? "", document_lines: lines };
}

function toIncident(o: Obj): IncidentExtract {
  return {
    case_id: str(o.case_id),
    org_name: str(o.org_name),
    recognized_at: str(o.recognized_at),
    recognition_ambiguous: bool(o.recognition_ambiguous),
    detected_at: str(o.detected_at),
    confirmed_at: str(o.confirmed_at),
    recognition_route: str(o.recognition_route),
    leaked_at: str(o.leaked_at),
    leaked_count: num(o.leaked_count),
    leaked_items: strArr(o.leaked_items),
    has_sensitive_or_unique_id: bool(o.has_sensitive_or_unique_id),
    external_access: bool(o.external_access),
    urgent_measure_note: str(o.urgent_measure_note),
    report_date: str(o.report_date),
  };
}

function toBreach(o: Obj): BreachReportExtract {
  return {
    org_name: str(o.org_name),
    reported_at: str(o.reported_at),
    report_target: str(o.report_target),
    leaked_at: str(o.leaked_at),
    leaked_count: num(o.leaked_count),
    leaked_items: strArr(o.leaked_items),
    has_timeline: bool(o.has_timeline),
    has_self_protection: bool(o.has_self_protection),
    has_response: bool(o.has_response),
    has_contact: bool(o.has_contact),
    cpo_name: str(o.cpo_name),
  };
}

function toNotice(o: Obj): NoticeExtract {
  return {
    org_name: str(o.org_name),
    notified_at: str(o.notified_at),
    notice_channel: str(o.notice_channel),
    leaked_count: num(o.leaked_count),
    leaked_items: strArr(o.leaked_items),
    has_items: bool(o.has_items),
    has_timeline: bool(o.has_timeline),
    has_self_protection: bool(o.has_self_protection),
    has_response: bool(o.has_response),
    has_contact: bool(o.has_contact),
    has_legal_rights: bool(o.has_legal_rights),
    notice_kind: str(o.notice_kind),
    is_possibility_notice: bool(o.is_possibility_notice),
  };
}

/** reason 문장에서 '인지/통지/신고' 뒤에 오는 시각을 읽어 온다 (추출값이 없을 때만 쓰는 보조 수단) */
export function timesFromReason(reason: string): {
  recognized_at?: string;
  notified_at?: string;
  reported_at?: string;
} {
  const out: { recognized_at?: string; notified_at?: string; reported_at?: string } = {};
  const re = /(\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reason)) !== null) {
    const before = reason.slice(Math.max(0, m.index - 24), m.index);
    const value = m[1].replace("T", " ");
    if (!out.recognized_at && /인지/.test(before)) out.recognized_at = value;
    else if (!out.notified_at && /통지/.test(before)) out.notified_at = value;
    else if (!out.reported_at && /신고/.test(before)) out.reported_at = value;
  }
  return out;
}

/**
 * Upstage 응답(또는 Studio 실행 결과)을 화면용 ReviewResult로 정규화한다.
 * - outputText: 마지막 노드의 텍스트 (설정 #5부터 JSON)
 * - raw: 전체 응답 (include: "all"이면 단계별 추출값이 들어 있음)
 */
export function normalize(outputText: string | undefined, raw: unknown): ReviewResult | undefined {
  const found: Found = { judgments: [], incidents: [], breaches: [], notices: [] };
  const seen = new Set<string>();

  let primary: Obj | undefined;
  if (outputText) {
    const parsed = tryParseJson(outputText);
    if (isObj(parsed) && DECISIONS.has(String(parsed.decision))) primary = parsed;
  }
  walk(raw, found, seen);

  // 판정 객체 고르기: output_text → 문서가 붙은 판정 → 마지막 판정
  const withDoc = found.judgments.filter((j) => Array.isArray(j.document_lines));
  const chosen = primary ?? withDoc.at(-1) ?? found.judgments.at(-1);
  if (!chosen) return undefined;

  const judgment = toJudgment(chosen);
  const document = toDocument(chosen) ?? (withDoc.at(-1) ? toDocument(withDoc.at(-1)!) : undefined);

  const extracts: Extracts = {
    incident: found.incidents.at(0) ? toIncident(found.incidents[0]) : undefined,
    breach: found.breaches.at(0) ? toBreach(found.breaches[0]) : undefined,
    notices: found.notices.map(toNotice),
  };

  // 타임라인 기준점
  let recognized_at = extracts.incident?.recognized_at || undefined;
  if (extracts.incident?.recognition_ambiguous) recognized_at = undefined;
  const noticeTimes = extracts.notices.map((n) => n.notified_at).filter((v): v is string => !!v);
  let notified_at = noticeTimes.length ? [...noticeTimes].sort()[0] : undefined;
  let reported_at = extracts.breach?.reported_at || undefined;

  let timelineFromReason = false;
  if (!extracts.incident && !extracts.breach && extracts.notices.length === 0) {
    const t = timesFromReason(judgment.reason);
    recognized_at = t.recognized_at;
    notified_at = t.notified_at;
    reported_at = t.reported_at;
    timelineFromReason = !!(t.recognized_at || t.notified_at || t.reported_at);
  }

  return {
    judgment,
    document,
    extracts,
    timeline: {
      recognized_at,
      notified_at,
      reported_at,
      hoursToNotice: hoursBetween(recognized_at, notified_at),
      hoursToReport: hoursBetween(recognized_at, reported_at),
    },
    timelineFromReason,
    source: document ? "followup" : primary ? "judgment" : "unknown",
  };
}
