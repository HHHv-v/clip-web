"use client";

import { useEffect, useState } from "react";

export const STEPS = ["읽기", "분류", "추출", "검증", "판정", "후속 문서"] as const;
/** 전체 예상 시간 중 각 단계가 끝나는 비율 (화면 표시용 추정) */
const BOUNDS = [0.08, 0.2, 0.45, 0.55, 0.8, 1];

export function StepProgress({
  status,
  startedAt,
  expectedMs,
}: {
  status: "uploading" | "queued" | "in_progress" | "completed" | "failed";
  startedAt: number;
  expectedMs: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status === "completed" || status === "failed") return;
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, [status]);

  const ratio = Math.min((now - startedAt) / expectedMs, 0.97);
  let current = BOUNDS.findIndex((b) => ratio < b);
  if (status === "uploading" || status === "queued") current = 0;
  if (status === "completed") current = STEPS.length;
  if (current < 0) current = STEPS.length - 1;

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs" aria-label="처리 단계">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current && status !== "completed" && status !== "failed";
        return (
          <li key={label} className="flex items-center gap-1">
            <span
              className={[
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-medium",
                done ? "bg-ink text-lime" : active ? "bg-lime text-ink clip-pulse" : "bg-line text-ink-mute",
              ].join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={done || active ? "text-ink" : "text-ink-mute"}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-ink-mute">›</span>}
          </li>
        );
      })}
      {status === "failed" && <li className="ml-2 text-bad font-medium">실패</li>}
      {status !== "completed" && status !== "failed" && (
        <li className="ml-2 text-ink-mute">(진행 단계는 예상 표시)</li>
      )}
    </ol>
  );
}
