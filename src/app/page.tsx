"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { StepProgress } from "@/components/StepProgress";
import { VerdictCard } from "@/components/VerdictCard";
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
  const done = runs.filter((r) => r.result).length;

  return (
    <>
      {/* 히어로 */}
      <section className="hero-bg text-paper">
        <Header mock={mock} />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pb-28 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pb-36">
          <div className="clip-rise">
            <div className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-3 py-1 text-xs font-medium text-paper/80">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              2026.9.11 개정 개인정보보호법 기준
            </div>
            <h1 className="mt-5 break-keep text-[2.5rem] font-black leading-[1.08] tracking-tight sm:text-[3.6rem]">
              유출 서류 3종,
              <br />
              <span className="text-lime">72시간</span> 안에 제대로 냈는지
              <br />
              1분 안에 1차 검수.
            </h1>
            <p className="mt-5 max-w-xl break-keep text-base leading-relaxed text-paper/70 sm:text-lg">
              유출 사고를 낸 기관의 개인정보 담당자가 통지문·신고서를 내보내기 전에 쓰는 1차 점검 도구입니다. 내부 사고 경위서 · 고객
              통지문 · 개인정보위 신고서를 올리면 기한, 신고 대상, 필수 항목, 서류 간 일치를 확인하고{" "}
              <b className="text-paper">적합 / 부적합 / 판단 보류</b>로 알려 드립니다. 보완할 것은 바로 문장으로 나옵니다. 애매한 것은 추측하지 않고 담당자 확인으로 넘깁니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-sm">
              {["통지·신고 각 72시간 계산", "신고 대상 3조건", "통지문 필수 6항목", "신고서 필수 칸", "서류 간 인원·항목 대조", "후속 문서 자동 작성"].map((t) => (
                <span key={t} className="rounded-full bg-paper/8 px-3 py-1.5 text-paper/85 ring-1 ring-paper/10">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="absolute inset-0 -z-0 rounded-full bg-lime/25 blur-3xl" />
            <Image src="/brand/logo-3d.png" alt="clip 로고" width={446} height={429} priority className="clip-float relative w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]" />
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8">
        {/* 1. 업로드 — 히어로 위로 겹쳐 올림 */}
        <div className="-mt-20 lg:-mt-24">
          <UploadZone onFiles={onFiles} busy={busy} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_21rem]">
          {/* 2·3·4. 판정 요약 → 상세 근거 → 후속 문서 */}
          <div className="min-w-0 space-y-6">
            {!selected ? (
              <EmptyState mock={mock} />
            ) : selected.result ? (
              <>
                <VerdictCard result={selected.result} fileName={selected.fileName} />
                <DecisionCard result={selected.result} fileName={selected.fileName} raw={selected.raw} />
                <FollowupDoc result={selected.result} />
              </>
            ) : (
              <div className="rounded-xl3 bg-white p-6 shadow-card">
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

          {/* 5. 케이스 목록 */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <CaseList runs={runs} selectedId={selected?.localId} onSelect={setSelectedId} onRemove={remove} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="올린 건" value={runs.length} />
              <Stat label="완료" value={done} />
              <Stat label="적합" value={runs.filter((r) => r.result?.judgment.decision === "적정").length} accent />
            </div>
            <p className="mt-4 px-1 text-[11px] leading-relaxed text-ink-mute">
              읽기(OCR) → 분류·분할 → 서류별 추출 → 규칙 검증 → 판정 → 후속 문서. 판정은 Upstage Studio 워크플로우가 하고, 이 화면은 근거를 보여 주고 다음 일을
              돕습니다.
            </p>
          </aside>
        </div>
      </main>

      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 text-xs text-ink-mute sm:px-8">
          <Image src="/brand/logo-symbol-ink.png" alt="" width={166} height={175} className="h-5 w-auto opacity-70" />
          <span>clip · Upstage AI Agent Hackathon v.2 · 1차 검수 보조 도구 — 최종 판단은 개인정보 보호책임자가 합니다</span>
        </div>
      </footer>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={["rounded-2xl px-2 py-3", accent ? "bg-lime text-ink" : "bg-white shadow-card"].join(" ")}>
      <div className="text-2xl font-black tnum leading-none">{value}</div>
      <div className={["mt-1 text-[11px]", accent ? "text-ink/70" : "text-ink-mute"].join(" ")}>{label}</div>
    </div>
  );
}

function EmptyState({ mock }: { mock: boolean }) {
  return (
    <div className="rounded-xl3 border border-dashed border-line bg-white/70 p-10 text-center">
      <Image src="/brand/logo-symbol-ink.png" alt="" width={166} height={175} className="mx-auto h-12 w-auto opacity-30" />
      <div className="mt-4 text-base font-bold">서류를 올리면 여기에 검수 결과가 나타납니다</div>
      <div className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
        적합 / 부적합 / 판단 보류 판정, 기준 4가지 통과 여부, 보완해야 할 것, 72시간 타임라인, 서류 간 대조표, 그리고 판정별 후속 문서까지.
      </div>
      {mock && (
        <div className="mx-auto mt-4 inline-block rounded-full bg-warn-bg px-3 py-1.5 text-xs text-warn">
          샘플 모드 — 파일 이름에 set01·set05·set06·set07·set10 이 들어 있으면 그 케이스의 결과가 나옵니다
        </div>
      )}
    </div>
  );
}
