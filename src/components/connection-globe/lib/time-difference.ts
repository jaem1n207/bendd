export function formatTimeDifference(minutes: number, progress = 1) {
  const absolute = Math.abs(minutes);
  // Whole-hour differences only count hours; fractional zones retain minutes.
  if (absolute % 60 === 0) {
    return `${Math.round((absolute / 60) * progress)}시간`;
  }
  const current = Math.round(absolute * progress);
  const hours = Math.floor(current / 60);
  const remainder = current % 60;
  return absolute < 60 ? `${remainder}분` : `${hours}시간 ${remainder}분`;
}

export function timeDifferenceSentence(minutes: number) {
  if (minutes === 0) {
    return '같은 시간대에 머물고 있어요.';
  }
  return `서울은 ${formatTimeDifference(minutes)} ${minutes > 0 ? '빠르네요.' : '느리네요.'}`;
}
