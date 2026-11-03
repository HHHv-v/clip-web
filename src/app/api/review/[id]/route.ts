import { NextResponse } from "next/server";
import { getJob, hasApiKey, outputTextOf, statusOf } from "@/lib/upstage";
import { readMockJob } from "@/lib/mock";
import { normalize } from "@/lib/normalize";
import type { JobStatusResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/review/{id}
 * Job 상태를 돌려준다. completed 이면 화면용으로 정규화한 result 와 원본 응답(raw)을 함께 준다.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (id.startsWith("mock-")) {
    const m = readMockJob(id);
    if (!m) return NextResponse.json({ error: "알 수 없는 샘플 Job" }, { status: 404 });
    const body: JobStatusResponse = { id, status: m.status, mock: true, result: m.result };
    return NextResponse.json(body);
  }

  if (!hasApiKey()) {
    return NextResponse.json({ error: "UPSTAGE_API_KEY 가 설정되지 않았습니다" }, { status: 400 });
  }

  try {
    const resp = await getJob(id);
    const status = statusOf(resp);
    if (status !== "completed") {
      const body: JobStatusResponse = {
        id,
        status,
        error: status === "failed" ? `워크플로우 실행 실패 (status: ${String(resp.status)})` : undefined,
      };
      return NextResponse.json(body);
    }
    const text = outputTextOf(resp);
    const result = normalize(text, resp);
    if (!result) {
      const body: JobStatusResponse = {
        id,
        status: "failed",
        error: "결과를 JSON으로 읽지 못했습니다. 워크플로우 설정 버전(config_id)을 확인하세요.",
        raw: resp,
      };
      return NextResponse.json(body);
    }
    const body: JobStatusResponse = { id, status, result, raw: resp };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ id, status: "failed", error: (e as Error).message }, { status: 502 });
  }
}
