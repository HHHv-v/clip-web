import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "clip — 개인정보 유출 72시간 대응 서류 검수",
  description:
    "내부 사고 경위서·고객 통지문·개인정보위 신고서를 올리면 72시간 기한, 신고 대상, 통지문 필수 항목, 서류 간 일치를 1차 검수합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
