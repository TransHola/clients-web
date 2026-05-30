function getDayDifferenceStr(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '';
  if (startDateStr === endDateStr) return '';
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    console.log({ startDateStr, endDateStr, start: start.toISOString(), end: end.toISOString(), diffTime, diffDays });
    if (diffDays === 1) return '(+1 day)';
    if (diffDays > 1) return `(+${diffDays} days)`;
    return '';
  } catch (e) {
    return '';
  }
}
console.log(getDayDifferenceStr("2026-05-20", "2026-05-21"));
console.log(getDayDifferenceStr("2026-05-20", "2026-05-20"));
console.log(getDayDifferenceStr("2026-5-20", "2026-05-20"));
