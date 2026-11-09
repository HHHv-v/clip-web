import Image from "next/image";
import Link from "next/link";

export function Header({ mock }: { mock: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 pt-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5" aria-label="clip 홈">
        <Image src="/brand/logo-symbol-white.png" alt="" width={388} height={408} className="h-8 w-auto" priority />
        <span className="sr-only">clip</span>
      </Link>
      <span className="hidden text-xs text-paper/50 sm:inline">개인정보 유출 72시간 대응 서류 검수</span>
      <div className="ml-auto flex items-center gap-2 text-xs">
        {mock ? (
          <span
            className="rounded-full bg-lime px-3 py-1.5 font-bold text-ink"
            title="UPSTAGE_API_KEY 가 없어 샘플 결과를 보여 줍니다"
          >
            샘플 모드
          </span>
        ) : (
          <span className="rounded-full border border-paper/20 px-3 py-1.5 font-medium text-paper/80">Upstage Studio 연결됨</span>
        )}
        <a
          href="https://github.com/HHHv-v/clip-web"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full border border-paper/20 px-3 py-1.5 font-medium text-paper/80 hover:bg-paper/10 sm:inline"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
