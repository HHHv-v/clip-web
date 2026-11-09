import type { ReviewResult } from "@/lib/types";
import { buildVerdict, type CriterionStatus, type Tone } from "@/lib/verdict";

const TONE: Record<Tone, { bg: string; text: string; sub: string; ring: string; dot: string }> = {
  ok: { bg: "bg-lime", text: "text-ink", sub: "text-ink/70", ring: "ring-lime", dot: "bg-ok" },
  bad: { bg: "bg-ink", text: "text-paper", sub: "text-paper/70", ring: "ring-ink", dot: "bg-bad" },
  hold: { bg: "bg-warn-bg", text: "text-warn", sub: "text-warn/80", ring: "ring-warn/40", dot: "bg-warn" },
};

const STATUS: Record<CriterionStatus, { label: string; cls: string; mark: string }> = {
  pass: { label: "통과", cls: "bg-ok-bg text-ok", mark: "✓" },
  fail: { label: "미흡", cls: "bg-bad-bg text-bad", mark: "✗" },
  hold: { label: "확인 필요", cls: "bg-warn-bg text-warn", mark: "!" },
  na: { label: "해당 없음", cls: "bg-paper text-ink-mute", mark: "–" },
};

export function VerdictCard({ result, fileName }: { result: ReviewResult; fileName: string }) {
  const v = buildVerdict(result);
  const tone = TONE[v.tone];
  const org = result.extracts.incident?.org_name || result.extracts.breach?.org_name || result.extracts.notices[0]?.org_name;

  return (
    <section className="clip-rise overflow-hidden rounded-xl3 bg-white shadow-lift">
      {/* 판정 띠 */}
      <div className={["px-6 py-6 sm:px-8 sm:py-7", tone.bg].join(" ")}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className={["text-sm font-semibold uppercase tracking-[0.18em]", tone.sub].join(" ")}>검수 결과</div>
            <div className={["mt-1 text-5xl font-black leading-none tracking-tight sm:text-6xl", tone.text].join(" ")}>{v.label}</div>
          </div>
          <div className={["max-w-xl pb-1 text-base leading-relaxed sm:text-lg", tone.sub].join(" ")}>{v.headline}</div>
          <div className={["ml-auto flex flex-wrap items-center gap-2 pb-1 text-sm", tone.sub].join(" ")}>
            <span className={["rounded-full px-2.5 py-1 font-semibold", v.tone === "bad" ? "bg-white/10 text-paper" : "bg-ink/10 text-ink"].join(" ")}>
              {result.judgment.case_id || "케이스 ID 없음"}
            </span>
            {org && <span>{org}</span>}
            <span className="truncate">{fileName}</span>
          </div>
        </div>
      </div>

      {/* 기준 4개 */}
      <div className="grid gap-px bg-line sm:grid-cols-2">
        {v.criteria.map((c) => {
          const s = STATUS[c.status];
          return (
            <div key={c.key} className="bg-white p-5">
              <span className={["inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold", s.cls].join(" ")}>
                <span>{s.mark}</span>
                {s.label}
              </span>
              <div className="mt-2 text-base font-semibold break-keep">{c.label}</div>
              <p className="mt-1 text-[15px] leading-snug text-ink-soft break-keep">{c.detail}</p>
            </div>
          );
        })}
      </div>

      {/* 보완해야 할 것 */}
      <div className="border-t border-line px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-bold">{v.actions.length ? `보완해야 할 것 ${v.actions.length}가지` : "보완할 것 없음"}</h3>
          <span className="text-sm text-ink-mute">1차 검수 · 최종 판단은 CPO</span>
        </div>
        {v.actions.length === 0 ? (
          <p className="mt-2 text-base text-ink-soft">네 가지 기준을 모두 통과했습니다. 아래 검수 확인서를 저장해 두면 감사 대응에 쓸 수 있습니다.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {v.actions.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className={["mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold", v.tone === "bad" ? "bg-ink text-lime" : "bg-warn text-white"].join(" ")}>
                  {i + 1}
                </span>
                <div>
                  <div className="text-base font-semibold leading-snug">{a.title}</div>
                  {a.detail && <div className="mt-0.5 text-[15px] leading-relaxed text-ink-soft">{a.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
