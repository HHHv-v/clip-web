"use client";

import { useCallback, useRef, useState } from "react";

export function UploadZone({ onFiles, busy }: { onFiles: (files: File[]) => void; busy: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const accept = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="서류 묶음 PDF 올리기"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files);
      }}
      className={[
        "group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition",
        over ? "border-lime-deep bg-ok-bg" : "border-line bg-white hover:border-ink-mute",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="font-semibold">사고 1건의 서류 묶음 PDF를 끌어다 놓거나 클릭해서 고르세요</div>
      <div className="mt-1 text-sm text-ink-mute">
        내부 사고 경위서 · 고객 통지문 · 개인정보위 신고서가 한 PDF에 섞여 있어도 됩니다. 여러 건을 한 번에 올릴 수 있어요.
      </div>
      {busy && <div className="mt-3 text-xs text-ink-soft clip-pulse">검수 중인 건이 있습니다…</div>}
    </div>
  );
}
