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
    <div className="rounded-xl3 bg-white p-2 shadow-lift">
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
          "group flex cursor-pointer flex-col items-center gap-4 rounded-[1.4rem] border-2 border-dashed px-6 py-9 text-center transition sm:flex-row sm:text-left",
          over ? "border-lime-deep bg-lime-soft" : "border-line bg-paper hover:border-ink-mute",
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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-lime transition group-hover:scale-105">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold tracking-tight">서류 묶음 PDF를 여기에 놓으세요</div>
          <div className="mt-1 text-sm text-ink-soft">
            내부 사고 경위서 · 고객 통지문 · 개인정보위 신고서가 한 PDF에 섞여 있어도 됩니다. 여러 건을 한 번에 올릴 수 있어요.
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-paper transition group-hover:bg-ink-2">
          {busy ? <span className="clip-pulse">검수 중…</span> : "파일 고르기"}
        </span>
      </div>
    </div>
  );
}
