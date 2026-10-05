/** Invalid or missing platform metadata must not discard valid coordinates. */
export function normalizeTimeZone(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: value.trim(),
    }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function offsetMinutes(timeZone: string, date: Date) {
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value;
  if (offset === 'GMT') {
    return 0;
  }
  const match = offset?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  return (
    (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1)
  );
}

/** Positive means Seoul is ahead; use one instant so daylight saving is exact. */
export function seoulTimeDifference(timeZone: unknown, date = new Date()) {
  const zone = normalizeTimeZone(timeZone);
  if (!zone || !Number.isFinite(date.getTime())) {
    return null;
  }
  const visitor = offsetMinutes(zone, date);
  const seoul = offsetMinutes('Asia/Seoul', date);
  return visitor === null || seoul === null ? null : seoul - visitor;
}
