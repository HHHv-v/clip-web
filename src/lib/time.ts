const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/;

/** 날짜뿐 아니라 시각(HH:MM)까지 적혀 있는지. 'YYYY-MM-DD'만 있으면 false */
export function hasClock(value?: string | null): boolean {
  return !!value && DATE_TIME_RE.test(value.trim());
}

/**
 * 'YYYY-MM-DD HH:MM' (또는 'YYYY-MM-DDTHH:MM') → 분 단위 정수.
 * 시각 없이 날짜만 있으면 00:00으로 가정하지 않고 undefined (계산 보류)
 */
export function toMinutes(value?: string | null): number | undefined {
  if (!value) return undefined;
  const m = value.trim().match(DATE_TIME_RE);
  if (!m) return undefined;
  const [, y, mo, d, h, mi] = m;
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

/** '2026-10-20 09:00' → '10/20 09:00', '2026-10-20' → '10/20 (시각 없음)' */
export function shortDateTime(value?: string): string {
  if (!value) return "—";
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
  if (!m) return value;
  return `${+m[2]}/${+m[3]} ${m[4] ?? "(시각 없음)"}`;
}

export const LIMIT_HOURS = 72;
