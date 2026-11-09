import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { Block } from "./followup";

const font = "Malgun Gothic";
const run = (text: string, opts: { bold?: boolean; size?: number; highlight?: boolean } = {}) =>
  new TextRun({ text, font, size: opts.size ?? 22, bold: opts.bold, highlight: opts.highlight ? "yellow" : undefined });

/** '[추가]' 표시는 형광펜으로 */
function runs(text: string, bold = false): TextRun[] {
  return text.split(/(\[추가\])/).filter(Boolean).map((t) => run(t, { bold, highlight: t === "[추가]" }));
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };

/** 후속 문서(제목 + 블록)를 Word 파일(Blob)로 만든다. 표는 실제 Word 표로 넣는다. 브라우저에서 실행된다 */
export async function buildDocxBlob(title: string, blocks: Block[]): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [run(title, { bold: true, size: 32 })],
    }),
  ];
  for (const b of blocks) {
    if (b.type === "gap") children.push(new Paragraph({ children: [run(" ")] }));
    else if (b.type === "heading") children.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: runs(b.text, true) }));
    else if (b.type === "para") children.push(new Paragraph({ spacing: { after: 80 }, children: runs(b.text) }));
    else if (b.type === "field") children.push(new Paragraph({ spacing: { after: 60 }, children: [run(`${b.label}: `, { bold: true }), ...runs(b.value)] }));
    else if (b.type === "bullets") for (const it of b.items) children.push(new Paragraph({ bullet: { level: 0 }, children: runs(it) }));
    else if (b.type === "table") {
      const cols = Math.max(b.header.length, ...b.rows.map((r) => r.length));
      const row = (cells: string[], head: boolean) =>
        new TableRow({
          children: Array.from({ length: cols }, (_, i) =>
            new TableCell({
              borders: { top: border, bottom: border, left: border, right: border },
              shading: head ? { fill: "F2F2F2" } : undefined,
              children: [new Paragraph({ children: runs(cells[i] ?? "", head) })],
            }),
          ),
        });
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(b.header, true), ...b.rows.map((r) => row(r, false))] }));
      children.push(new Paragraph({ children: [run(" ")] }));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
