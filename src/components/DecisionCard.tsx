"use client";

import { useState } from "react";
import type { Decision, NoticeExtract, ReviewResult } from "@/lib/types";
import { Timeline72 } from "./Timeline72";

const TONE: Record<Decision, { badge: string; ring: string; label: string }> = {
  적정: { badge: "bg-lime text-ink", ring: "border-lime-deep/40", label: "기한·항목·일치 모두 통과" },
  보완필요: { badge: "bg-warn text-white", ring: "border-warn/40", label: "무엇이 모자란지 분명함" },
  검토필요: { badge: "bg-bad text-white", ring: "border-bad/40", label: "서류만으로 확정 불가 — 사람이 봐야 함" },
};

const CHECKS: { key: keyof NoticeExtract; label: string }[] = [
  { key: "has_items", label: "유출 항목" },
  { key: "has_timeline", label: "유출 시점과 경위" },
  { key: "has_self_protection", label: "피해 최소화 방법" },
  { key: "has_response", label: "대응조치 및 구제절차" },
  { key: "has_contact", label: "담당부서 연락처" },
  { key: "has_legal_rights", label: "법적 권리 안내" },
];

function fmtCount(n?: number) {
  return n === undefined || n === 0 ? "—" : `${n.toLocaleString("ko-KR")}명`;
}
function fmtItems(items?: string[]) {
  return items && items.length ? items.join(", ") : "—";
}
function sameSet(a?: string[], b?: string[]) {
  if (!a || !b) return true;
  const norm = (x: string[]) => [...new Set(x.map((s) => s.replace(/\s/g, "")))].sort().join("|");
  return norm(a) === norm(b);
}

export function DecisionCard({ result, fileName, raw }: { result: ReviewResult; fileName: string; raw?: unknown }) {
  const { judgment, extracts } = result;
  const tone = TONE[judgment.decision] ?? TONE.검토필요;
  const [showRaw, setShowRaw] = useState(false);

  const notice = extracts.notices;
  const checkValue = (key: keyof NoticeExtract): boolean | undefined => {
    if (!notice.length) return undefined;
    return notice.some((n) => n[key] === true);
  };
  const missing = new Set(judgment.missing_items);

  const counts = [extracts.incident?.leaked_count, extracts.notices[0]?.leaked_count, extracts.breach?.leaked_count].filter(
    (c): c is number => typeof c === "number" && c > 0,
  );
  const countMismatch = new Set(counts).size > 1;
  const itemsMismatch =
    !sameSet(extracts.incident?.leaked_items, extracts.breach?.leaked_items) ||
    !sameSet(extracts.incident?.leaked_items, extracts.notices[0]?.leaked_items);

  const hasExtracts = !!extracts.incident || !!extracts.breach || extracts.notices.length > 0;
  const org = extracts.incident?.org_name || extracts.breach?.org_name || extracts.notices[0]?.org_name;

  return (
    <div className={["rounded-2xl border bg-white p-5 shadow-sm", tone.ring].join(" ")}>
      {/* 헤더 */}
      <div className="flex flex-wrap items-start gap-3">
        <span className={["rounded-xl px-3 py-1.5 text-lg font-extrabold tracking-tight", tone.badge].join(" ")}>
          {judgment.decision}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-semibold">{judgment.case_id || "케이스 ID 없음"}</span>
            {org && <span className="text-ink-soft">· {org}</span>}
            <span className="text-ink-mute truncate">· {fileName}</span>
          </div>
          <div className="text-xs text-ink-mute mt-0.5">{tone.label}</div>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-medium",
            judgment.report_required ? "bg-ink text-lime" : "bg-paper text-ink-soft border border-line",
          ].join(" ")}
        >
          {judgment.report_required ? "개인정보위 신고 대상" : "신고 대상 아님"}
        </span>
      </div>

      {/* 신고 대상 근거 */}
      {extracts.incident && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <Chip on={(extracts.incident.leaked_count ?? 0) >= 1000} label={`유출 인원 ${fmtCount(extracts.incident.leaked_count)}`} hint="1천 명 이상" />
          <Chip on={!!extracts.incident.has_sensitive_or_unique_id} label="민감·고유식별정보" />
          <Chip on={!!extracts.incident.external_access} label="외부 불법 접근" />
          {extracts.incident.recognition_route && <span className="rounded-full border border-line px-2 py-0.5 text-ink-mute">인지 경로: {extracts.incident.recognition_route}</span>}
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <Timeline72 result={result} />

        {/* 통지문 필수 6항목 */}
        <section>
          <h3 className="text-sm font-semibold">고객 통지문 필수 6항목</h3>
          <div className="mb-2 text-xs text-ink-mute">
            {notice.length > 1 ? `통지문 ${notice.length}부(가능성·확정) 합산` : "개인정보보호법 제34조 · 시행령 제40조"}
          </div>
          {notice.length === 0 ? (
            <div className="rounded-xl bg-bad-bg px-3 py-2 text-sm text-bad">통지문이 서류 묶음에 없습니다 {missing.has("고객 통지문") && "— missing_items에 '고객 통지문'"}</div>
          ) : (
            <ul className="grid grid-cols-2 gap-1.5 text-sm">
              {CHECKS.map((c) => {
                const v = checkValue(c.key);
                const flagged = missing.has(c.label);
                return (
                  <li
                    key={c.key}
                    className={[
                      "flex items-center gap-2 rounded-lg px-2 py-1",
                      v === false || flagged ? "bg-bad-bg text-bad" : "bg-paper text-ink",
                    ].join(" ")}
                  >
                    <span className="font-bold">{v === false || flagged ? "✗" : v === true ? "✓" : "?"}</span>
                    <span className="whitespace-nowrap">{c.label}</span>
                    {c.key === "has_legal_rights" && (
                      <span className="ml-auto rounded bg-white/70 px-1 text-[10px] whitespace-nowrap text-ink-mute" title="2026.9.11 시행 개정 개인정보보호법에서 추가된 필수 항목">
                        개정 추가
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* 서류 간 대조표 */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">서류 간 대조 (인원 · 항목 · 인지 시각)</h3>
        {hasExtracts ? (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-paper text-xs text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">항목</th>
                  <th className="px-3 py-2 text-left font-medium">내부 사고 경위서</th>
                  <th className="px-3 py-2 text-left font-medium">고객 통지문</th>
                  <th className="px-3 py-2 text-left font-medium">개인정보위 신고서</th>
                </tr>
              </thead>
              <tbody className="[&_td]:px-3 [&_td]:py-2 [&_tr]:border-t [&_tr]:border-line [&_td:first-child]:whitespace-nowrap">
                <tr className={countMismatch ? "bg-bad-bg" : ""}>
                  <td className="font-medium">유출 인원</td>
                  <td className="tnum">{extracts.incident ? fmtCount(extracts.incident.leaked_count) : "없음"}</td>
                  <td className="tnum">{extracts.notices[0] ? fmtCount(extracts.notices[0].leaked_count) : "없음"}</td>
                  <td className="tnum">{extracts.breach ? fmtCount(extracts.breach.leaked_count) : "없음"}</td>
                </tr>
                <tr className={itemsMismatch ? "bg-bad-bg" : ""}>
                  <td className="font-medium">유출 항목</td>
                  <td>{extracts.incident ? fmtItems(extracts.incident.leaked_items) : "없음"}</td>
                  <td>{extracts.notices[0] ? fmtItems(extracts.notices[0].leaked_items) : "없음"}</td>
                  <td>{extracts.breach ? fmtItems(extracts.breach.leaked_items) : "없음"}</td>
                </tr>
                <tr>
                  <td className="font-medium">기준 시각</td>
                  <td className="tnum">
                    {extracts.incident
                      ? extracts.incident.recognized_at || (extracts.incident.recognition_ambiguous ? `탐지 ${extracts.incident.detected_at || "—"} / 확인 ${extracts.incident.confirmed_at || "—"}` : "—")
                      : "없음"}
                    <span className="ml-1 text-xs text-ink-mute">최초 인지</span>
                  </td>
                  <td className="tnum">
                    {extracts.notices.map((n) => n.notified_at || "—").join(" / ") || "없음"}
                    <span className="ml-1 text-xs text-ink-mute">통지</span>
                  </td>
                  <td className="tnum">
                    {extracts.breach ? extracts.breach.reported_at || "—" : "없음"}
                    <span className="ml-1 text-xs text-ink-mute">신고</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl bg-paper px-3 py-2 text-sm text-ink-mute">
            단계별 추출값이 응답에 없어 대조표를 만들 수 없습니다. (Job 생성 시 include: [&quot;all&quot;] 인지 확인)
          </div>
        )}
      </section>

      {/* 판정 근거 */}
      <section className="mt-6">
        <h3 className="mb-1 text-sm font-semibold">판정 근거</h3>
        <p className="text-sm leading-relaxed text-ink-soft">{judgment.reason}</p>
        {judgment.missing_items.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {judgment.missing_items.map((m) => (
              <span key={m} className="rounded-full bg-bad-bg px-2.5 py-0.5 text-xs font-medium text-bad">
                누락: {m}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-ink-mute">
          <span>결과 노드: {result.source === "followup" ? "후속 문서 노드 (판정 5키 복사본)" : result.source === "judgment" ? "검수_판정" : "알 수 없음"}</span>
          {raw !== undefined && (
            <button type="button" className="underline hover:text-ink" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "원문 JSON 닫기" : "원문 JSON 보기"}
            </button>
          )}
        </div>
        {showRaw && raw !== undefined && (
          <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-ink p-3 text-[11px] leading-snug text-paper">
            {JSON.stringify(raw, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

function Chip({ on, label, hint }: { on: boolean; label: string; hint?: string }) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5",
        on ? "bg-ok-bg text-ok font-medium" : "border border-line text-ink-mute",
      ].join(" ")}
      title={hint}
    >
      {on ? "● " : "○ "}
      {label}
    </span>
  );
}
