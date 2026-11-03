export function Header({ mock }: { mock: boolean }) {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-lime">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M8.5 12.5l6-6a2.5 2.5 0 013.5 3.5l-7.5 7.5a4.5 4.5 0 01-6.4-6.4L12 3.2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="leading-tight">
          <div className="font-extrabold text-lg tracking-tight">clip</div>
          <div className="text-xs text-ink-mute">개인정보 유출 72시간 대응 서류 검수</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {mock ? (
            <span className="whitespace-nowrap rounded-full border border-warn/40 bg-warn-bg px-2.5 py-1 text-warn font-medium" title="UPSTAGE_API_KEY 가 없어 샘플 결과를 보여 줍니다">
              샘플 모드
            </span>
          ) : (
            <span className="rounded-full border border-line bg-white px-2.5 py-1 text-ink-soft">
              Upstage Studio 연결
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
