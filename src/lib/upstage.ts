import "server-only";

/**
 * Upstage Studio Agent API (OpenAI 호환) — 서버에서만 호출한다.
 * API 키는 환경변수 UPSTAGE_API_KEY 로만 읽고, 코드·브라우저에 절대 넣지 않는다.
 *
 * 흐름: files(업로드) → responses(Job 생성, include: all) → responses/{id} 폴링 → output_text(JSON) 파싱
 */
const BASE = process.env.UPSTAGE_BASE_URL ?? "https://api.upstage.ai/v2";
export const AGENT_ID = process.env.UPSTAGE_AGENT_ID ?? "agt_dYaUgJFxXSDceXaB8VcYH2";
export const CONFIG_ID = process.env.UPSTAGE_CONFIG_ID ?? "22";

export function hasApiKey(): boolean {
  return !!process.env.UPSTAGE_API_KEY && process.env.MOCK_MODE !== "1";
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.UPSTAGE_API_KEY ?? ""}` };
}

async function fail(prefix: string, r: Response): Promise<never> {
  const text = await r.text().catch(() => "");
  throw new Error(`${prefix} (${r.status}) ${text.slice(0, 300)}`);
}

/** 1) 서류 묶음 PDF 업로드 → file_id */
export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("purpose", "user_data");
  const r = await fetch(`${BASE}/files`, { method: "POST", headers: authHeaders(), body: fd });
  if (!r.ok) await fail("파일 업로드 실패", r);
  const j = (await r.json()) as { id: string };
  return j.id;
}

/** 2) 워크플로우 Job 생성 (비동기) */
export async function createJob(fileId: string): Promise<{ id: string; status: string }> {
  const body = {
    model: AGENT_ID,
    input: [{ role: "user", content: [{ type: "input_file", file_id: fileId }] }],
    include: ["all"], // 단계별 결과(추출값 등)까지 받는다. 마지막 노드만 필요하면 ["last"]
    config_id: CONFIG_ID, // 제출한 설정 버전으로 고정
  };
  const r = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) await fail("Job 생성 실패", r);
  const j = (await r.json()) as { id: string; status?: string };
  return { id: j.id, status: j.status ?? "queued" };
}

/** 3) Job 상태 조회 (OpenAI SDK와 같은 형식의 쿼리: include[]=all) */
export async function getJob(id: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${BASE}/responses/${encodeURIComponent(id)}?include[]=all`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) await fail("Job 조회 실패", r);
  return (await r.json()) as Record<string, unknown>;
}

/** 응답에서 output_text 꺼내기. 없으면 output[].content[].text 를 이어 붙인다 (OpenAI SDK와 동일한 규칙) */
export function outputTextOf(resp: Record<string, unknown>): string | undefined {
  if (typeof resp.output_text === "string" && resp.output_text.trim()) return resp.output_text;
  const output = resp.output;
  if (!Array.isArray(output)) return undefined;
  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const o = item as { type?: string; content?: unknown };
    if (o.type !== "message" || !Array.isArray(o.content)) continue;
    for (const c of o.content) {
      const cc = c as { type?: string; text?: string };
      if (cc.type === "output_text" && typeof cc.text === "string") texts.push(cc.text);
    }
  }
  return texts.length ? texts.join("") : undefined;
}

export type NormalizedStatus = "queued" | "in_progress" | "completed" | "failed";

export function statusOf(resp: Record<string, unknown>): NormalizedStatus {
  const s = String(resp.status ?? "").toLowerCase();
  if (s === "completed" || s === "succeeded" || s === "success") return "completed";
  if (s === "queued" || s === "pending") return "queued";
  if (s === "in_progress" || s === "running" || s === "processing") return "in_progress";
  if (!s) return "in_progress";
  return "failed";
}
