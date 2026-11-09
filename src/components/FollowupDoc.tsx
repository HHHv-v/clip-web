"use client";

import { useState } from "react";
import type { ReviewResult } from "@/lib/types";
import { downloadBlob, downloadText, safeName } from "@/lib/download";
import { sectionText, splitSections, type Block, type DocSection } from "@/lib/followup";
import { buildLocalDoc } from "@/lib/localdoc";

const DOC_KIND: Record<string, string> = {
  적정: "검수 확인서",
  보완필요: "보완 요청서",
  검토필요: "담당자 확인 요청서",
};

const INTRO: Record<string, string> = {
  적정: "기한과 필수 항목을 모두 충족했다는 확인서입니다. 감사·점검 대응용으로 보관하세요.",
  보완필요: "고쳐야 할 내용을 담당 부서에 요청하는 문서입니다. 확인 후 그대로 보내거나 고쳐서 쓰세요.",
  검토필요: "서류만으로 정할 수 없는 부분을 담당자에게 확인받기 위한 요청서입니다.",
};

export function FollowupDoc({ result, pending }: { result: ReviewResult; pending?: boolean }) {
  const { judgment, document: aiDoc } = result;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [building, setBuilding] = useState(false);

  // 기본 문서는 웹이 판정·추출값으로 바로 만든다(즉시, 15줄 이내). 워크플로우가 쓴 문서는 있으면 별도 탭으로
  const local = splitSections(buildLocalDoc(result), DOC_KIND[judgment.decision] ?? "후속 문서").map((s) => ({ ...s, audience: s.audience ?? "회사 안에서 쓰는 내부 문서" }));
  const ai = aiDoc ? splitSections(aiDoc, "AI 작성본").map((s) => ({ ...s, name: s.name === "AI 작성본" ? s.name : `AI 작성본 · ${s.name}` })) : [];
  const sections: DocSection[] = [...local, ...ai];
  const cur: DocSection = sections[Math.min(tab, sections.length - 1)];
  const text = sectionText(cur);
  const base = safeName(`${judgment.case_id || "case"}_${cur.name}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 권한이 없으면 조용히 무시 */
    }
  };

  const toDocx = async () => {
    setBuilding(true);
    try {
      const { buildDocxBlob } = await import("@/lib/docx");
      downloadBlob(await buildDocxBlob(cur.title, cur.blocks), `${base}.docx`);
    } finally {
      setBuilding(false);
    }
  };

  const mailto = `mailto:?subject=${encodeURIComponent(cur.title)}&body=${encodeURIComponent(text)}`;

  return (
    <div className="rounded-xl3 bg-white p-6 shadow-card sm:p-7">
      {/* 머리: 이게 무엇인지 */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-[0.14em] text-ink-mute">다음 단계 · 보낼 문서 초안</div>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight">
            {local[0]?.name}
            {ai.length > 0 && <span className="text-ink-mute"> + AI 작성본 {ai.length}개</span>}
          </h3>
          <p className="mt-1 text-base text-ink-soft break-keep">{INTRO[judgment.decision] ?? "판정 결과에 맞춰 만든 문서 초안입니다."}</p>
          {pending && !aiDoc && <p className="mt-1 text-sm text-ink-mute">워크플로우의 상세 문서(AI 작성본)는 아직 작성 중입니다.</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper hover:bg-ink-2"
          aria-expanded={open}
        >
          {open ? "접기" : "문서 펼쳐 보기"}
        </button>
      </div>

      {open && (
        <>
          {/* 문서 탭 + 동작 */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-line pb-3">
            {sections.map((s, i) => (
              <button
                key={s.name + i}
                type="button"
                onClick={() => setTab(i)}
                className={[
                  "rounded-full px-3.5 py-1.5 text-base font-semibold",
                  i === tab ? "bg-lime text-ink" : "bg-paper text-ink-soft ring-1 ring-line hover:text-ink",
                ].join(" ")}
              >
                {s.name}
                {s.audience && <span className="ml-1.5 text-xs font-normal opacity-70">{/고객/.test(s.audience) ? "고객용" : "내부용"}</span>}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-1.5 text-sm">
              <Btn onClick={copy}>{copied ? "복사됨 ✓" : "복사"}</Btn>
              <Btn onClick={() => downloadText(text, `${base}.txt`)}>TXT</Btn>
              <Btn onClick={toDocx} disabled={building}>
                {building ? "만드는 중…" : "Word(.docx)"}
              </Btn>
              <a href={mailto} className={btnClass}>
                메일로 보내기
              </a>
            </div>
          </div>

          {/* 문서 본문 */}
          <article className="mt-4 rounded-2xl bg-paper p-5 sm:p-6">
            {cur.audience && <div className="text-sm text-ink-mute">{cur.audience}</div>}
            <h4 className="mt-1 text-lg font-bold break-keep">{cur.title}</h4>
            <div className="mt-4 space-y-2 text-base leading-relaxed">
              {cur.blocks.map((b, i) => (
                <BlockView key={i} b={b} />
              ))}
            </div>
          </article>
          <p className="mt-3 text-sm text-ink-mute">
            {cur.lines.some((l) => l.includes("[추가]")) && (
              <>
                <mark className="rounded bg-lime px-1 font-semibold text-ink">추가</mark> 표시는 원래 서류에서 빠져 있어 새로 넣은 부분입니다.{" "}
              </>
            )}
            {!cur.lines.some((l) => l.startsWith("※")) && "※ 1차 검수 결과이며 최종 판단은 개인정보 보호책임자가 합니다."}
          </p>
        </>
      )}
    </div>
  );
}

/** '[추가]'를 형광펜으로 */
function Hl({ text }: { text: string }) {
  const parts = text.split(/(\[추가\])/);
  return (
    <>
      {parts.map((p, i) =>
        p === "[추가]" ? (
          <mark key={i} className="mr-1 rounded bg-lime px-1 font-semibold text-ink">
            추가
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "gap":
      return <div className="h-1" />;
    case "heading":
      return <div className="pt-2 font-bold text-ink">{b.text}</div>;
    case "para":
      return (
        <p className="text-ink-soft break-keep">
          <Hl text={b.text} />
        </p>
      );
    case "field":
      return (
        <div className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-3">
          <span className="text-ink-mute">{b.label}</span>
          <span className="break-keep text-ink">
            <Hl text={b.value} />
          </span>
        </div>
      );
    case "bullets":
      return (
        <ul className="list-disc space-y-1 pl-5 text-ink-soft marker:text-ink-mute">
          {b.items.map((it, i) => (
            <li key={i} className="break-keep">
              <Hl text={it} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
          <table className="w-full text-[15px]">
            <thead className="bg-paper text-ink-soft">
              <tr>
                {b.header.map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-t border-line align-top">
                  {b.header.map((_, j) => (
                    <td key={j} className={["px-3 py-2 break-keep", j === 0 ? "font-semibold text-ink" : "text-ink-soft"].join(" ")}>
                      <Hl text={r[j] ?? ""} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

const btnClass =
  "inline-flex items-center rounded-full bg-ink px-3.5 py-2 text-sm font-bold text-paper transition hover:bg-ink-2 disabled:opacity-50";

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={btnClass}>
      {children}
    </button>
  );
}
