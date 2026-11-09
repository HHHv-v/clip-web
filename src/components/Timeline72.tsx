import type { ReviewResult } from "@/lib/types";
import { LIMIT_HOURS, formatHours, hasClock, shortDateTime } from "@/lib/time";
import { pendingReason } from "@/lib/explain";

type RowState =
  | { kind: "hours"; hours: number }
  | { kind: "pending"; reason: string } // 날짜는 있는데 계산 불가 → 검토필요
  | { kind: "missing"; text: string; bad: boolean }; // 서류 없음 / 신고 대상 아님

function Row({ label, at, state, scaleMax }: { label: string; at?: string; state: RowState; scaleMax: number }) {
  const limitLeft = (LIMIT_HOURS / scaleMax) * 100;
  const hours = state.kind === "hours" ? state.hours : undefined;
  const over = hours !== undefined && hours > LIMIT_HOURS;
  const width = hours === undefined ? 0 : Math.max(2, Math.min(100, (Math.max(hours, 0) / scaleMax) * 100));

  return (
    <div>
      <div className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3">
        <div className="text-base font-semibold whitespace-nowrap">{label}</div>
        <div className="relative h-10">
          {state.kind === "hours" && (
            <>
              <div className="absolute inset-y-2.5 left-0 right-0 rounded-full bg-line" />
              <div className={["absolute inset-y-2.5 left-0 rounded-full", over ? "bg-bad" : "bg-lime"].join(" ")} style={{ width: `${width}%` }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-ink" style={{ left: `${limitLeft}%` }} aria-hidden />
              <div className="absolute -top-1 -translate-x-1/2 rounded bg-ink px-1 text-[11px] font-bold text-paper" style={{ left: `${limitLeft}%` }}>
                72h
              </div>
            </>
          )}
          {state.kind === "pending" && (
            <div className="absolute inset-y-1.5 left-0 right-0 flex items-center justify-center rounded-full border-2 border-dashed border-warn/60 bg-warn-bg text-sm font-bold text-warn">
              ! 검토필요 · 계산 불가
            </div>
          )}
          {state.kind === "missing" && (
            <>
              <div className="absolute inset-y-2.5 left-0 right-0 rounded-full bg-line" />
              <div
                className={[
                  "absolute inset-y-0 left-3 flex items-center text-sm whitespace-nowrap",
                  state.bad ? "font-semibold text-bad" : "text-ink-mute",
                ].join(" ")}
              >
                <span className="rounded bg-white px-1">{state.text}</span>
              </div>
            </>
          )}
        </div>
        <div className="min-w-[8rem] text-right tnum">
          {state.kind === "hours" ? (
            <>
              <span className={["text-xl font-black leading-none", over ? "text-bad" : "text-ink"].join(" ")}>{formatHours(hours)}</span>
              <span className={["ml-1 text-sm font-semibold", over ? "text-bad" : "text-ok"].join(" ")}>{over ? "초과" : "이내"}</span>
              <div className="text-xs text-ink-mute">{shortDateTime(at)}</div>
            </>
          ) : state.kind === "pending" ? (
            <>
              <span className="text-base font-bold text-warn">검토필요</span>
              <div className="text-xs text-ink-mute">{shortDateTime(at)}</div>
            </>
          ) : (
            <span className="text-ink-mute">—</span>
          )}
        </div>
      </div>
      {/* 계산할 수 없는 이유는 바 밖으로 꺼내 잘 보이게 */}
      {state.kind === "pending" && (
        <div className="mt-1.5 flex gap-2 rounded-xl bg-warn-bg px-3 py-2 text-[15px] leading-snug text-warn">
          <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warn text-[11px] font-black text-white">!</span>
          <span className="break-keep">{state.reason}</span>
        </div>
      )}
    </div>
  );
}

export function Timeline72({ result }: { result: ReviewResult }) {
  const { timeline, judgment, extracts } = result;
  const t0 = timeline.recognized_at;
  const ambiguous = extracts.incident?.recognition_ambiguous;
  const maxHours = Math.max(timeline.hoursToNotice ?? 0, timeline.hoursToReport ?? 0, LIMIT_HOURS);
  const scaleMax = maxHours * 1.12;

  const hasNotice = extracts.notices.length > 0 || !!timeline.notified_at;
  const hasBreach = !!extracts.breach || !!timeline.reported_at;

  const stateOf = (kind: "notice" | "report"): RowState => {
    const hours = kind === "notice" ? timeline.hoursToNotice : timeline.hoursToReport;
    if (kind === "notice" && !hasNotice) return { kind: "missing", text: "통지문 없음", bad: true };
    if (kind === "report" && !hasBreach)
      return judgment.report_required ? { kind: "missing", text: "신고서 없음 (신고 대상)", bad: true } : { kind: "missing", text: "신고 대상 아님", bad: false };
    if (t0 && hours !== undefined) return { kind: "hours", hours };
    return {
      kind: "pending",
      reason: pendingReason(kind, result) ?? `${kind === "notice" ? "통지" : "신고"} 시각을 서류에서 읽지 못해 72시간을 셀 수 없습니다.`,
    };
  };

  return (
    <section>
      <h3 className="text-lg font-bold">72시간 타임라인</h3>
      <div className="mb-3 text-sm text-ink-mute tnum">
        기준점(최초 인지){" "}
        {t0 ? (
          <span className="font-semibold text-ink">
            {t0}
            {!hasClock(t0) && <span className="ml-1 text-warn">(시각 없음)</span>}
          </span>
        ) : ambiguous ? (
          <span className="font-semibold text-warn">미확정 — 최초 인지 시각이 불명확해 추측하지 않음</span>
        ) : (
          <span className="font-semibold text-bad">없음</span>
        )}
      </div>
      <div className="space-y-5">
        <Row label="고객 통지" at={timeline.notified_at} state={stateOf("notice")} scaleMax={scaleMax} />
        <Row label="개인정보위 신고" at={timeline.reported_at} state={stateOf("report")} scaleMax={scaleMax} />
      </div>
      {result.timelineFromReason && (
        <p className="mt-2 text-sm text-ink-mute">※ 단계별 추출값이 없어 판정 근거 문장에서 시각을 읽었습니다.</p>
      )}
    </section>
  );
}
