import { NextResponse } from "next/server";
import { AGENT_ID, CONFIG_ID, createJob, hasApiKey, uploadFile } from "@/lib/upstage";
import { makeMockJobId } from "@/lib/mock";
import type { CreateJobResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

/** GET /api/review — 화면이 실행 모드(샘플/실제)를 알기 위한 간단한 상태 */
export async function GET() {
  return NextResponse.json({ mock: !hasApiKey(), agent: AGENT_ID, config: CONFIG_ID });
}

/**
 * POST /api/review  (multipart/form-data, field: file)
 * 서류 묶음 PDF를 Upstage에 올리고 워크플로우 Job을 만든 뒤, Job id만 바로 돌려준다.
 * 결과는 GET /api/review/{id} 로 폴링한다 (서버리스 실행 시간 제한을 피하기 위해 두 단계로 나눔).
 */
export async function POST(req: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "multipart/form-data 요청이 아닙니다" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file 필드가 없습니다" }, { status: 400 });
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "PDF 파일만 올릴 수 있습니다" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "파일이 20MB를 넘습니다" }, { status: 413 });
  }

  if (!hasApiKey()) {
    const body: CreateJobResponse = { id: makeMockJobId(file.name), status: "queued", mock: true };
    return NextResponse.json(body);
  }

  try {
    const fileId = await uploadFile(file);
    const job = await createJob(fileId);
    const body: CreateJobResponse = {
      id: job.id,
      status: job.status === "completed" ? "completed" : job.status === "in_progress" ? "in_progress" : "queued",
    };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
