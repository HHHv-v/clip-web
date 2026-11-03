"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { StepProgress } from "@/components/StepProgress";
import { DecisionCard } from "@/components/DecisionCard";
import { FollowupDoc } from "@/components/FollowupDoc";
import { CaseList } from "@/components/CaseList";
import type { CaseRun, CreateJobResponse, JobStatusResponse } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POLL_MS_REAL = 2500;
const POLL_MS_MOCK = 800;
const TIMEOUT_MS = 10 * 60 * 1000;

export default function Page() {
  const [runs, setRuns] = useState<CaseRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [mock, setMock] = useState(false);

  useEffect(() => {
    fetch("/api/review")
      .then((r) => r.json())
      .then((d: { mock: boolean }) => setMock(!!d.mock))
      .catch(() => {});
  }, []);

  const update = useCallback((localId: string, patch: Partial<CaseRun>) => {
    setRuns((prev) => prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  }, []);

  const poll = useCallback(
    async (localId: string, jobId: string, isMock: boolean) => {
      const deadline = Date.now() + TIMEOUT_MS;
      while (Date.now() < deadline) {
        await sleep(isMock ? POLL_MS_MOCK : POLL_MS_REAL);
        const res = await fetch(`/api/review/${encodeURIComponent(jobId)}`, { cache: "no-store" });
        const data = (await res.json()) as JobStatusResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (data.status === "completed" && data.result) {
          update(localId, { status: "completed", result: data.result, raw: data.raw, finishedAt: Date.now() });
          setSelectedId(localId);
          return;
        }
        if (data.status === "failed") throw new Error(data.error ?? "워크플로우 실행 실패");
        update(localId, { status: data.status });
      }
      throw new Error("10분 안에 결과가 오지 않았습니다");
    },
    [update],
  );

  const startReview = useCallback(
    async (file: File) => {
      const localId = crypto.randomUUID();
      setRuns((prev) => [{ localId, fileName: file.name, status: "uploading", startedAt: Date.now() }, ...prev]);
      setSelectedId((prev) => prev ?? localId);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/review", { method: "POST", body: fd });
        const data = (await res.json()) as CreateJobResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        update(localId, { jobId: data.id, status: data.status, mock: data.mock });
        await poll(localId, data.id, !!data.mock);
      } catch (e) {
        update(localId, { status: "failed", error: (e as Error).message, finishedAt: Date.now() });
      }
    },
    [poll, update],
  );

  const onFiles = useCallback(
    (files: File[]) => {
      for (const f of files) void startReview(f);
    },
    [startReview],
  );

  const remove = useCallback((id: string) => {
    setRuns((prev) => prev.filter((r) => r.localId !== id));
    setSelectedId((prev) => (prev === id ? undefined : prev));
  }, []);

  const selected = runs.find((r) => r.localId === selectedId) ?? runs.find((r) => r.result) ?? runs[0];
  const busy = runs.some((r) => r.status === "uploading" || r.status === "queued" || r.status === "in_progress");

  return (
    <>
      <Header mock={mock} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* 문제 한 줄 */}
        <section className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight">
            유출을 알게 된 순간부터 <span className="bg-lime px-1">72시간</span>. 서류 3종을 사람 대신 1차 검수합니다.
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            내부 사고 경위서 · 고객 통지문 · 개인정보위 신고서를 한 PDF로 올리면 기한(통지·신고 각 72시간), 신고 대상 여부, 통지문 필수 6항목,
            서류 간 인원·항목 일치를 확인하고 <b>적정 / 보완필요 / 검토필요</b>로 판정합니다. 2026.9.11 시행 개정 개인정보보호법 기준.
          </p>
        </section>

        {/* 1. 업로드 */}
        <UploadZone onFiles={onFiles} busy={busy} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* 2·3. 판정 카드 + 후속 문서 */}
          <div className="min-w-0 space-y-6">
            {!selected ? (
              <EmptyState mock={mock} />
            ) : selected.result ? (
              <>
                <DecisionCard result={selected.result} fileName={selected.fileName} raw={selected.raw} />
                <FollowupDoc result={selected.result} />
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="font-semibold">{selected.fileName}</span>
                  {selected.status === "failed" ? (
                    <span className="text-bad">실패 — {selected.error}</span>
                  ) : (
                    <span className="text-ink-mute clip-pulse">검수 중…</span>
                  )}
                </div>
                <StepProgress status={selected.status} startedAt={selected.startedAt} expectedMs={selected.mock ? 6500 : 75000} />
              </div>
            )}
          </div>

          {/* 4. 케이스 목록 */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <CaseList runs={runs} selectedId={selected?.localId} onSelect={setSelectedId} onRemove={remove} />
            <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-mute">
              처리 흐름: 읽기(OCR) → 분류·분할 → 서류별 추출 → 규칙 검증 → 판정 → 후속 문서. 판정은 Upstage Studio 워크플로우가 하고, 이 화면은
              근거를 보여 주고 다음 일을 돕습니다.
            </p>
          </aside>
        </div>
      </main>
      <footer className="border-t border-line py-4 text-center text-xs text-ink-mute">clip · Upstage AI Agent Hackathon v.2 · 1차 검수 보조 도구</footer>
    </>
  );
}

function EmptyState({ mock }: { mock: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 p-8 text-center text-sm text-ink-mute">
      <div className="font-medium text-ink">서류를 올리면 여기에 판정 카드가 나타납니다.</div>
      <div className="mt-1">
        판정 배지 · 72시간 타임라인 · 통지문 필수 6항목 · 서류 간 대조표 · 판정 근거, 그리고 판정별 후속 문서(검수 확인서 / 보완 요청서 / 담당자 확인 요청서).
      </div>
      {mock && (
        <div className="mt-3 text-xs text-warn">
          샘플 모드: 파일 이름에 set01·set05·set06·set07·set10(또는 C01…)이 들어 있으면 그 케이스의 결과를 보여 줍니다. 실제 판정은 .env 에 UPSTAGE_API_KEY 를 넣으면 됩니다.
        </div>
      )}
    </div>
  );
}
