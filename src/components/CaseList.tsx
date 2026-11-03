"use client";

import type { CaseRun, Decision } from "@/lib/types";
import { formatHours, LIMIT_HOURS } from "@/lib/time";
import { downloadText } from "@/lib/download";

const BADGE: Record<Decision, string> = {
  적정: "bg-lime text-ink",
  보완필요: "bg-warn text-white",
  검토필요: "bg-bad text-white",
};

function statusLabel(r: CaseRun) {
  switch (r.status) {
    case "uploading":
      return "올리는 중";
    case "queued":
      return "대기";
    case "in_progress":
      return "검수 중";
    case "failed":
      return "실패";
    default:
      return "완료";
  }
}

export function CaseList({
  runs,
  selectedId,
  onSelect,
  onRemove,
}: {
  runs: CaseRun[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const done = runs.filter((r) => r.result);

  const exportJson = () => {
    // 팀 채점.py 가 읽는 형식: [{case_id, decision, report_required, missing_items, reason}, …]
    const list = done.map((r) => r.result!.judgment);
    downloadText(JSON.stringify(list, null, 2), "clip_results.json", "application/json;charset=utf-8");
  };

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">케이스 목록</h2>
        <span className="text-xs text-ink-mute">
          {runs.length}건 · 완료 {done.length}
        </span>
        <button
          type="button"
          onClick={exportJson}
          disabled={done.length === 0}
          className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-paper disabled:opacity-40"
        >
          결과 JSON 내보내기
        </button>
      </div>
      {runs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ink-mute">아직 올린 서류가 없습니다.</div>
      ) : (
        <ul className="divide-y divide-line">
          {runs.map((r) => {
            const j = r.result?.judgment;
            const t = r.result?.timeline;
            const selected = r.localId === selectedId;
            const hn = t?.hoursToNotice;
            const hr = t?.hoursToReport;
            return (
              <li key={r.localId}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(r.localId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelect(r.localId);
                  }}
                  className={["flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper", selected ? "bg-paper" : ""].join(" ")}
                >
                  <span className="w-10 shrink-0 font-semibold tnum">{j?.case_id || "—"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink-soft">
                      {r.result?.extracts.incident?.org_name || r.fileName}
                      {r.mock && <span className="ml-1 text-[10px] text-warn">샘플</span>}
                    </span>
                    {r.result && (
                      <span className="block truncate text-[11px] tnum text-ink-mute">
                        {hn !== undefined || hr !== undefined ? (
                          <>
                            통지 <b className={hn !== undefined && hn > LIMIT_HOURS ? "text-bad" : "text-ink"}>{formatHours(hn)}</b> · 신고{" "}
                            <b className={hr !== undefined && hr > LIMIT_HOURS ? "text-bad" : "text-ink"}>{formatHours(hr)}</b>
                          </>
                        ) : (
                          "기준점 미확정"
                        )}
                      </span>
                    )}
                  </span>
                  {j ? (
                    <span className={["shrink-0 rounded-md px-2 py-0.5 text-xs font-bold", BADGE[j.decision] ?? BADGE.검토필요].join(" ")}>{j.decision}</span>
                  ) : (
                    <span className={["shrink-0 text-xs", r.status === "failed" ? "text-bad" : "text-ink-mute clip-pulse"].join(" ")}>{statusLabel(r)}</span>
                  )}
                  <button
                    type="button"
                    aria-label="목록에서 지우기"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(r.localId);
                    }}
                    className="shrink-0 rounded px-1 text-ink-mute hover:text-ink"
                  >
                    ×
                  </button>
                </div>
                {r.error && <div className="px-4 pb-2 text-xs text-bad">{r.error}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
