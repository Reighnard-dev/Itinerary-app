const DAY_MS = 86_400_000;

function parts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {year:Number(match[1]), month:Number(match[2]), day:Number(match[3])};
}

function utcDay(value: string) {
  const date = parts(value);
  return date ? Date.UTC(date.year, date.month - 1, date.day) : Number.NaN;
}

export function addDays(value: string, amount: number) {
  const timestamp = utcDay(value);
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp + amount * DAY_MS);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function inclusiveDays(arrival: string, departure: string) {
  const start = utcDay(arrival), end = utcDay(departure);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / DAY_MS) + 1;
}

export function departureFor(arrival: string, days: number) {
  return arrival ? addDays(arrival, Math.max(1, days) - 1) : '';
}
