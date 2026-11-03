import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

/** 후속 문서(제목 + 줄 배열)를 Word 파일(Blob)로 만든다. 브라우저에서 실행된다 */
export async function buildDocxBlob(title: string, lines: string[]): Promise<Blob> {
  const font = "Malgun Gothic";
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: title, font, bold: true, size: 32 })],
    }),
  ];
  for (const line of lines) {
    const isHeading = /^\[.+\]$/.test(line.trim());
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: line === "" ? " " : line,
            font,
            size: 22,
            bold: isHeading,
          }),
        ],
      }),
    );
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
