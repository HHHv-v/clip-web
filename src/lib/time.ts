/** 'YYYY-MM-DD HH:MM' (또는 'YYYY-MM-DDTHH:MM', 'YYYY-MM-DD') → 분 단위 정수. 못 읽으면 undefined */
export function toMinutes(value?: string | null): number | undefined {
  if (!value) return undefined;
  const m = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return undefined;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  // 시간대와 무관하게 '적힌 시각' 그대로 계산한다 (UTC로 고정)
  const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  if (Number.isNaN(ms)) return undefined;
  return Math.round(ms / 60000);
}

/** 두 시각의 차이를 시간(소수 1자리)으로. 어느 하나라도 없으면 undefined */
export function hoursBetween(from?: string, to?: string): number | undefined {
  const a = toMinutes(from);
  const b = toMinutes(to);
  if (a === undefined || b === undefined) return undefined;
  return Math.round(((b - a) / 60) * 10) / 10;
}

/** 30 → '30시간', 22.5 → '22시간 30분', 음수는 그대로 '-3시간' */
export function formatHours(h?: number): string {
  if (h === undefined) return "—";
  const sign = h < 0 ? "-" : "";
  const abs = Math.abs(h);
  const whole = Math.floor(abs);
  const minutes = Math.round((abs - whole) * 60);
  if (minutes === 0) return `${sign}${whole}시간`;
  return `${sign}${whole}시간 ${minutes}분`;
}

/** '2026-10-20 09:00' → '10/20 09:00' */
export function shortDateTime(value?: string): string {
  if (!value) return "—";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
  if (!m) return value;
  return `${+m[2]}/${+m[3]}${m[4] ? ` ${m[4]}` : ""}`;
}

export const LIMIT_HOURS = 72;
