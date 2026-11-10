// Each reading reports energy consumed during a quarter-hour, in whole Wh.
export function rollup(readings) {
  if (!Array.isArray(readings) || !readings.length) throw Error('Empty meter batch');
  const hours = new Map();
  for (const {meter, start, wh} of readings) {
    if (typeof meter !== 'string' || !meter.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:(00|15|30|45):00Z$/.test(start)
        || !Number.isFinite(Date.parse(start)) || new Date(start).toISOString().replace('.000Z','Z') !== start
        || !Number.isSafeInteger(wh) || wh < 0) throw Error('Invalid meter interval');
    const hour = start.slice(0, 13) + ':00:00Z';
    const key = JSON.stringify([meter, hour]);
    if (!hours.has(key)) hours.set(key, {meter, hour, intervals: new Map()});
    const {intervals} = hours.get(key);
    if (intervals.has(start) && intervals.get(start) !== wh) throw Error('MR-409 conflicting interval');
    intervals.set(start, wh);
  }
  return [...hours.values()].map(({meter, hour, intervals}) => {
    if (intervals.size !== 4) throw Error('MR-104 incomplete hour');
    const wh = [...intervals.values()].reduce((total, amount) => total + amount, 0);
    if (!Number.isSafeInteger(wh)) throw Error('Hourly total exceeds integer precision');
    return {meter, hour, wh};
  }).sort((a,b) => a.meter.localeCompare(b.meter) || a.hour.localeCompare(b.hour));
}
