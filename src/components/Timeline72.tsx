import type { ReviewResult } from "@/lib/types";
import { LIMIT_HOURS, formatHours, shortDateTime } from "@/lib/time";

function Row({
  label,
  at,
  hours,
  scaleMax,
  missingText,
  missingTone,
}: {
  label: string;
  at?: string;
  hours?: number;
  scaleMax: number;
  missingText: string;
  missingTone: "mute" | "bad";
}) {
  const over = hours !== undefined && hours > LIMIT_HOURS;
  const width = hours === undefined ? 0 : Math.max(2, Math.min(100, (Math.max(hours, 0) / scaleMax) * 100));
  const limitLeft = (LIMIT_HOURS / scaleMax) * 100;
  return (
    <div className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
      <div className="text-sm font-semibold whitespace-nowrap">{label}</div>
      <div className="relative h-8">
        <div className="absolute inset-y-2.5 left-0 right-0 rounded-full bg-line" />
        {hours !== undefined ? (
          <>
            <div
              className={["absolute inset-y-2.5 left-0 rounded-full", over ? "bg-bad" : "bg-lime"].join(" ")}
              style={{ width: `${width}%` }}
            />
            <div className="absolute top-0 bottom-0 w-0.5 bg-ink" style={{ left: `${limitLeft}%` }} aria-hidden />
            <div className="absolute -top-1 -translate-x-1/2 rounded bg-ink px-1 text-[10px] font-bold text-paper" style={{ left: `${limitLeft}%` }}>
              72h
            </div>
          </>
        ) : (
          <div
            className={[
              "absolute inset-y-0 left-3 flex items-center text-xs whitespace-nowrap",
              missingTone === "bad" ? "text-bad font-semibold" : "text-ink-mute",
            ].join(" ")}
          >
            {missingText}
          </div>
        )}
      </div>
      <div className="min-w-[6.5rem] text-right tnum">
        {hours !== undefined ? (
          <>
            <span className={["text-xl font-black leading-none", over ? "text-bad" : "text-ink"].join(" ")}>{formatHours(hours)}</span>
            <span className={["ml-1 text-xs font-semibold", over ? "text-bad" : "text-ok"].join(" ")}>{over ? "초과" : "이내"}</span>
            <div className="text-[11px] text-ink-mute">{shortDateTime(at)}</div>
          </>
        ) : (
          <span className="text-ink-mute">—</span>
        )}
      </div>
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

  return (
    <section>
      <h3 className="text-sm font-bold">72시간 타임라인</h3>
      <div className="mb-3 text-xs text-ink-mute tnum">
        기준점(최초 인지){" "}
        {t0 ? (
          <span className="font-semibold text-ink">{t0}</span>
        ) : ambiguous ? (
          <span className="font-semibold text-bad">미확정 — 탐지·확인 시각이 둘이라 추측하지 않음</span>
        ) : (
          <span className="font-semibold text-bad">없음</span>
        )}
      </div>
      <div className="space-y-3">
        <Row
          label="고객 통지"
          at={timeline.notified_at}
          hours={t0 ? timeline.hoursToNotice : undefined}
          scaleMax={scaleMax}
          missingText={!hasNotice ? "통지문 없음" : !t0 ? `통지 ${shortDateTime(timeline.notified_at)} · 기준점 없어 계산 보류` : "—"}
          missingTone={!hasNotice ? "bad" : "mute"}
        />
        <Row
          label="개인정보위 신고"
          at={timeline.reported_at}
          hours={t0 ? timeline.hoursToReport : undefined}
          scaleMax={scaleMax}
          missingText={
            !hasBreach
              ? judgment.report_required
                ? "신고서 없음 (신고 대상)"
                : "신고 대상 아님"
              : !t0
                ? `신고 ${shortDateTime(timeline.reported_at)} · 기준점 없어 계산 보류`
                : "—"
          }
          missingTone={!hasBreach && judgment.report_required ? "bad" : "mute"}
        />
      </div>
      {result.timelineFromReason && (
        <p className="mt-2 text-xs text-ink-mute">※ 단계별 추출값이 없어 판정 근거 문장에서 시각을 읽었습니다.</p>
      )}
    </section>
  );
}
