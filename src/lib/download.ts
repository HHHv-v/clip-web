"use client";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, type = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([text], { type }), filename);
}

/** 파일 이름에 못 쓰는 문자 정리 */
export function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim() || "clip";
}
