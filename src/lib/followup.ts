import type { FollowupDocument } from "./types";
import { koKeyNames } from "./explain";

/**
 * 워크플로우 후속 문서(document_lines)를 사람이 읽기 좋은 구조로 나눈다.
 * - '[문서 1] 보완 요청서 (…)' 줄을 기준으로 문서를 나누고
 * - 'a | b | c' 줄은 표로, '1. 검수 판정' 같은 짧은 줄은 소제목으로, '- '·'· '는 목록으로 묶는다.
 * - true/false, recognized_at 같은 기계용 값은 '예/아니오', '최초 인지 일시'로 바꾼다.
 */

export type Block =
  | { type: "heading"; text: string }
  | { type: "para"; text: string }
  | { type: "field"; label: string; value: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "gap" };

export interface DocSection {
  /** 탭 이름 (예: '보완 요청서') */
  name: string;
  /** 누구에게 쓰는 문서인지 (예: '담당 부서에 보내는 내부 문서') */
  audience?: string;
  /** 문서 제목 줄 ('제목: …'이 있으면 그것) */
  title: string;
  lines: string[];
  blocks: Block[];
}

/** 기계용 값 정리: true/false → 예/아니오, 칸 이름 → 한국어 */
export function cleanLine(line: string): string {
  return koKeyNames(line)
    .replace(/\btrue\b/g, "예")
    .replace(/\bfalse\b/g, "아니오")
    .replace(/\bnull\b/g, "없음");
}

const DOC_HEAD = /^\s*\[문서\s*\d+\]\s*(.+?)\s*(?:\((.+)\))?\s*$/;
const isTableLine = (l: string) => (l.match(/\|/g)?.length ?? 0) >= 1 && !/^\s*[-·•]/.test(l);
const isHeading = (l: string) => {
  const t = l.trim();
  if (/^\[.+\]$/.test(t)) return true;
  // '1. 검수 판정', '사고 개요' 처럼 짧고 문장으로 끝나지 않는 줄
  if (/^\d+\.\s+\S/.test(t) && t.length <= 40 && !/[다요]\.?$/.test(t) && !t.includes(":")) return true;
  return false;
};

export function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      if (blocks.at(-1)?.type !== "gap") blocks.push({ type: "gap" });
      continue;
    }
    if (isTableLine(line)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && isTableLine(lines[i].trim())) {
        rows.push(lines[i].split("|").map((c) => c.trim()));
        i++;
      }
      i--;
      if (rows.length === 1 || rows.every((r) => r.length === 2)) {
        // 두 칸짜리('회사명 | 나무결가구')는 표가 아니라 항목:값 목록으로
        for (const [label, ...rest] of rows) blocks.push({ type: "field", label, value: rest.join(" · ") });
      } else {
        const [header, ...body] = rows;
        blocks.push({ type: "table", header, rows: body });
      }
      continue;
    }
    if (isHeading(line)) {
      blocks.push({ type: "heading", text: line.replace(/^\[(.+)\]$/, "$1") });
      continue;
    }
    const bullet = line.match(/^(?:[-·•]|\d+\)|※)\s*(.+)$/);
    if (bullet && !line.startsWith("※")) {
      const last = blocks.at(-1);
      if (last?.type === "bullets") last.items.push(bullet[1]);
      else blocks.push({ type: "bullets", items: [bullet[1]] });
      continue;
    }
    const field = line.match(/^([^:：]{1,14})[:：]\s*(.+)$/);
    if (field && !/https?$/.test(field[1])) {
      blocks.push({ type: "field", label: field[1].trim(), value: field[2] });
      continue;
    }
    blocks.push({ type: "para", text: line });
  }
  while (blocks.at(-1)?.type === "gap") blocks.pop();
  while (blocks[0]?.type === "gap") blocks.shift();
  return blocks;
}

function audienceOf(name: string, hint?: string): string | undefined {
  if (hint) return hint;
  if (/통지문|안내문/.test(name)) return "고객에게 보내는 안내문";
  if (/요청서|확인서/.test(name)) return "회사 안에서 쓰는 내부 문서";
  return undefined;
}

export function splitSections(doc: FollowupDocument, fallbackName: string): DocSection[] {
  const lines = doc.document_lines.map(cleanLine);
  const sections: { name: string; hint?: string; lines: string[] }[] = [];
  let cur: { name: string; hint?: string; lines: string[] } | undefined;
  for (const line of lines) {
    const m = line.match(DOC_HEAD);
    if (m) {
      cur = { name: m[1].trim(), hint: m[2]?.trim(), lines: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) {
      cur = { name: fallbackName, lines: [] };
      sections.push(cur);
    }
    cur.lines.push(line);
  }
  const docTitle = cleanLine(doc.document_title).replace(/^제목:\s*/, "");
  return sections
    .filter((s) => s.lines.some((l) => l.trim()))
    .map((s) => {
      const titleIdx = s.lines.findIndex((l) => /^\s*제목[:：]/.test(l));
      const title = titleIdx >= 0 ? s.lines[titleIdx].replace(/^\s*제목[:：]\s*/, "") : sections.length === 1 ? docTitle : s.name;
      const body = titleIdx >= 0 ? s.lines.filter((_, i) => i !== titleIdx) : s.lines;
      return { name: s.name, audience: audienceOf(s.name, s.hint), title, lines: body, blocks: toBlocks(body) };
    });
}

/** 복사·TXT용 평문 */
export function sectionText(s: DocSection): string {
  return [s.title, "", ...s.lines].join("\n").trim();
}
