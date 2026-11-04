"use client";

import { useState } from "react";
import type { ReviewResult } from "@/lib/types";
import { downloadBlob, downloadText, safeName } from "@/lib/download";

const DOC_KIND: Record<string, string> = {
  적정: "검수 확인서",
  보완필요: "보완 요청서 · 수정 통지문 초안",
  검토필요: "담당자 확인 요청서",
};

export function FollowupDoc({ result }: { result: ReviewResult }) {
  const { judgment, document: doc } = result;
  const [copied, setCopied] = useState(false);
  const [building, setBuilding] = useState(false);

  if (!doc) {
    return (
      <div className="rounded-xl3 bg-white p-6 text-sm text-ink-mute shadow-card">
        후속 문서가 응답에 없습니다. 워크플로우 설정 #5 이상(후속 문서 노드가 document_lines 를 내는 버전)으로 실행했는지 확인하세요.
      </div>
    );
  }

  const text = [doc.document_title, "", ...doc.document_lines].join("\n");
  const base = safeName(`${judgment.case_id || "case"}_${doc.document_title || DOC_KIND[judgment.decision] || "후속문서"}`);

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
      const blob = await buildDocxBlob(doc.document_title, doc.document_lines);
      downloadBlob(blob, `${base}.docx`);
    } finally {
      setBuilding(false);
    }
  };

  const mailto = `mailto:?subject=${encodeURIComponent(`[clip] ${doc.document_title}`)}&body=${encodeURIComponent(text)}`;

  return (
    <div className="rounded-xl3 bg-white p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">후속 문서 · {DOC_KIND[judgment.decision] ?? "후속 문서"}</div>
          <h3 className="text-lg font-bold tracking-tight">{doc.document_title}</h3>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5 text-xs">
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
      <div className="mt-4 rounded-2xl bg-paper p-5 text-sm leading-relaxed whitespace-pre-wrap font-[inherit]">
        {doc.document_lines.map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="h-3" />
          ) : /^\[.+\]$/.test(line.trim()) ? (
            <div key={i} className="mt-1 font-semibold">
              {line}
            </div>
          ) : (
            <div key={i}>{line}</div>
          ),
        )}
      </div>
      <p className="mt-3 text-xs text-ink-mute">※ 본 결과는 1차 검수이며 최종 판단은 개인정보 보호책임자(CPO)가 합니다.</p>
    </div>
  );
}

const btnClass =
  "inline-flex items-center rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-paper transition hover:bg-ink-2 disabled:opacity-50";

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={btnClass}>
      {children}
    </button>
  );
}
