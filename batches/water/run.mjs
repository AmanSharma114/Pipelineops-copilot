// A sealed export describes one probe and the inclusive sequence range it should contain.
export function summarizeWater(batch) {
  const { probe, calibration, first, last, readings } = batch ?? {};
  if (typeof probe !== 'string' || !probe.trim() || typeof calibration !== 'string'
      || !calibration.trim() || !Number.isSafeInteger(first) || !Number.isSafeInteger(last)
      || first < 1 || last < first || !Array.isArray(readings)) throw Error('Invalid probe manifest');

  const samples = new Map();
  let minNtu = Infinity;
  let maxNtu = -Infinity;
  for (const { seq, ntu, calibration: observed } of readings) {
    if (!Number.isSafeInteger(seq) || seq < first || seq > last ||
        !Number.isFinite(ntu) || ntu < 0) throw Error('Invalid probe reading');
    if (observed !== calibration) throw Error('WQ-208 calibration mismatch');
    if (samples.has(seq) && samples.get(seq) !== ntu) throw Error('WQ-409 conflicting sample');
    samples.set(seq, ntu);
    minNtu = Math.min(minNtu, ntu);
    maxNtu = Math.max(maxNtu, ntu);
  }
  if (samples.size !== last - first + 1) throw Error('WQ-104 missing probe sequence');
  return { probe, calibration, first, last, samples: samples.size, minNtu, maxNtu };
}
