/**
 * Finds the time a signal first crosses a target value.
 * @param {number[]} time - The time array.
 * @param {number[]} signal - The signal array.
 * @param {number} target - The target value.
 * @returns {number|null} - The time of first crossing, or null.
 */
function findCrossing(time, signal, target) {
  for (let i = 1; i < signal.length; i++) {
    if ((signal[i-1] < target && signal[i] >= target) || (signal[i-1] > target && signal[i] <= target)) {
      return time[i];
    }
  }
  return null;
}

/**
 * Calculates key performance metrics from a simulation result.
 * @param {object} result - The simulation result object { time, Vc, i, ... }.
 * @param {string} primaryTrace - The name of the trace to analyze (e.g., 'Vc').
 * @param {number} finalValue - The steady-state value of the signal.
 * @param {string[]} requestedMetrics - Array of metric keys to calculate.
 * @returns {object} - An object containing the calculated metrics.
 */
export function calculateMetrics(result, primaryTrace, finalValue, requestedMetrics) {
  const { time, [primaryTrace]: signal } = result;
  if (!time || !signal || !requestedMetrics) return {};

  const metrics = {};
  const len = time.length;

  // Find peak value
  if (requestedMetrics.includes('peakValue') || requestedMetrics.includes('overshoot')) {
    const peakValue = Math.max(...signal);
    const peakTime = time[signal.indexOf(peakValue)];
    metrics.peakValue = { value: peakValue, unit: 'V' }; // Assuming Volts, adjust as needed
    metrics.peakTime = { value: peakTime, unit: 's' };

    if (finalValue > 1e-6) { // Avoid division by zero
      const overshoot = ((peakValue - finalValue) / finalValue) * 100;
      metrics.overshoot = { value: overshoot, unit: '%' };
    }
  }

  // Find Rise Time (10% to 90%)
  if (requestedMetrics.includes('riseTime')) {
    const t10 = findCrossing(time, signal, finalValue * 0.1);
    const t90 = findCrossing(time, signal, finalValue * 0.9);
    if (t10 !== null && t90 !== null) {
      metrics.riseTime = { value: t90 - t10, unit: 's' };
    }
  }

  // Find Settling Time (within 2% of final value)
  if (requestedMetrics.includes('settlingTime')) {
    const settleLower = finalValue * 0.98;
    const settleUpper = finalValue * 1.02;
    let tSettle = null;
    for (let i = len - 1; i >= 0; i--) {
      if (signal[i] < settleLower || signal[i] > settleUpper) {
        tSettle = time[i+1 < len ? i + 1 : i];
        break;
      }
    }
    // If it never settles, tSettle will be null. If it settles immediately, it's time[0]
    metrics.settlingTime = { value: tSettle === null ? time[0] : tSettle, unit: 's' };
  }

  return metrics;
}

/**
 * Helper to format a metric for display.
 * @param {object} metric - The metric object { value, unit }.
 * @returns {string} - Formatted string.
 */
export function formatMetric(metric) {
  if (!metric || typeof metric.value !== 'number') return 'N/A';
  const { value, unit } = metric;
  
  if (value === Infinity) return 'Infinity';

  if (Math.abs(value) > 1e6) return `${(value / 1e6).toFixed(2)} M${unit}`;
  if (Math.abs(value) > 1e3) return `${(value / 1e3).toFixed(2)} k${unit}`;
  if (Math.abs(value) < 1e-9 && value !== 0) return `${(value * 1e12).toFixed(2)} p${unit}`;
  if (Math.abs(value) < 1e-6 && value !== 0) return `${(value * 1e9).toFixed(2)} n${unit}`;
  if (Math.abs(value) < 1e-3 && value !== 0) return `${(value * 1e6).toFixed(2)} µ${unit}`;
  if (Math.abs(value) < 1 && value !== 0) return `${(value * 1e3).toFixed(2)} m${unit}`;
  
  return `${value.toFixed(2)} ${unit}`;
}