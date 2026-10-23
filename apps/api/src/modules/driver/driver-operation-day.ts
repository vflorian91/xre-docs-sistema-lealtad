/** Guatemala's operational day, independent of the server's timezone. */
export function driverOperationDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)!.value;
  const start = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00-06:00`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
