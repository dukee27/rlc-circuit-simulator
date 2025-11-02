// NEW/UPDATED:
// - CHANGED all `defaults` for L and C to be in BASE UNITS (H, F).
// - Added correct "2nd order" transfer functions to the 3rd order circuits.
// - RESTORED `order: 3` for grouping, as requested.
// - FIXED parallel RLC transfer function string.

export const circuitDefinitions = {
  "1-rc-charge": {
    order: 1,
    label: "1st Order: RC (Low-Pass Filter)",
    image: "1-rc-charge.svg.png",
    params: ["V", "R", "C"],
    defaults: { V: 10, R: 1000, C: 0.000001, tEnd: 0.005, Freq: 1000 }, // C: 1µF
    inputType: ["Step", "Ramp", "Sine"],
    solver: "solveRcCharge",
    metrics: ["riseTime", "settlingTime"],
    transferFunction: "1 / (1 + sRC)",
    plots: [
      { title: "Capacitor Voltage (Vc)", yLabel: "Voltage (V)", traces: ["Vc"] },
      { title: "Circuit Current (i)", yLabel: "Current (A)", traces: ["i"] },
    ],
  },
  "1-rl-energize": {
    order: 1,
    label: "1st Order: RL (Low-Pass Filter)",
    image: "1-rl-energize.svg.png",
    params: ["V", "R", "L"],
    defaults: { V: 10, R: 10, L: 0.01, tEnd: 0.005, Freq: 1000 }, // L: 10mH
    inputType: ["Step", "Ramp", "Sine"],
    solver: "solveRlEnergize",
    metrics: ["riseTime", "settlingTime"],
    transferFunction: "R / (R + sL)",
    plots: [
      { title: "Inductor Current (iL)", yLabel: "Current (A)", traces: ["iL"] },
      { title: "Inductor Voltage (Vl)", yLabel: "Voltage (V)", traces: ["Vl"] },
    ],
  },
  "2-rlc-series": {
    order: 2,
    label: "2nd Order: Series RLC (Band-Pass)",
    image: "2-rlc-series.svg.png",
    params: ["V", "R", "L", "C"],
    defaults: { V: 10, R: 50, L: 0.01, C: 0.000001, tEnd: 0.01, Freq: 1000 }, // L: 10mH, C: 1µF
    inputType: ["Step", "Ramp", "Sine"],
    solver: "solveRlcSeries",
    metrics: ["riseTime", "settlingTime", "overshoot", "peakTime", "peakValue"],
    transferFunction: "(sRC) / (s^2LC + sRC + 1)", // Transfer function for Vr
    plots: [
      { title: "Capacitor Voltage (Vc) & Current (i)", yLabel: "Voltage (V)", yLabel2: "Current (A)", traces: ["Vc", "i"] },
      { title: "Resistor & Inductor Voltages", yLabel: "Voltage (V)", traces: ["Vr", "Vl"] },
    ],
  },
  "1-rc-discharge": {
    order: 1,
    label: "1st Order: RC Discharging",
    image: "1-rc-discharge.svg.png",
    params: ["V0", "R", "C"],
    defaults: { V0: 10, R: 1000, C: 0.000001, tEnd: 0.005, Freq: 1000 }, // C: 1µF
    inputType: ["Step"],
    solver: "solveRcDischarge",
    metrics: ["settlingTime"],
    transferFunction: "1 / (1 + sRC)",
    plots: [
      { title: "Capacitor Voltage (Vc)", yLabel: "Voltage (V)", traces: ["Vc"] },
      { title: "Circuit Current (i)", yLabel: "Current (A)", traces: ["i"] },
    ],
  },
  "1-rl-deenergize": {
    order: 1,
    label: "1st Order: RL De-energizing",
    image: "1-rl-deenergize.svg.webp",
    params: ["I0", "R", "L"],
    defaults: { I0: 1, R: 10, L: 0.01, tEnd: 0.005, Freq: 1000 }, // L: 10mH
    inputType: ["Step"],
    solver: "solveRlDeEnergize",
    metrics: ["settlingTime"],
    transferFunction: "R / (R + sL)",
    plots: [
      { title: "Inductor Current (iL)", yLabel: "Current (A)", traces: ["iL"] },
      { title: "Transient Voltage (Vr)", yLabel: "Voltage (V)", traces: ["Vr"] },
    ],
  },
  "2-rlc-parallel": {
    order: 2,
    label: "2nd Order: Parallel RLC (Current Source)",
    image: "2-rlc-parallel.svg.png",
    params: ["V", "R", "L", "C"], // V is treated as Current (I) for this model
    defaults: { V: 1, R: 50, L: 0.01, C: 0.00001, tEnd: 0.05, Freq: 1000 }, // I: 1A, L: 10mH, C: 10µF
    inputType: ["Step", "Ramp", "Sine"],
    solver: "solveRlcParallel",
    metrics: ["riseTime", "settlingTime", "overshoot", "peakTime", "peakValue"],
    transferFunction: "sL / (s^2LC + sL/R + 1)", // H(s) = V(s) / I_in(s)
    plots: [
      { title: "Parallel Voltage (Vc)", yLabel: "Voltage (V)", traces: ["Vc"] },
      { title: "Branch Currents", yLabel: "Current (A)", traces: ["iL", "iC", "iR"] },
    ],
  },
  "3-rllc-series": {
    order: 3, // Restored to 3 for UI grouping
    label: "Series R-L-L-C",
    image: "3-rllc-series.svg.png",
    params: ["V", "R", "L1", "L2", "C"],
    defaults: { V: 10, R: 10, L1: 0.01, L2: 0.01, C: 0.0001, tEnd: 0.05, Freq: 1000 }, // L: mH, C: µF
    inputType: ["Step", "Ramp", "Sine"],
    solver: "solveRllcSeries",
    metrics: ["riseTime", "settlingTime", "overshoot"],
    transferFunction: "1 / (s^2*C*(L1+L2) + s*C*R + 1)", // H(s) = Vc(s) / V_in(s)
    plots: [
        { title: "Capacitor Voltage (Vc) & Current (i)", yLabel: "Voltage (V)", yLabel2: "Current (A)", traces: ["Vc", "i"] },
        { title: "Total Inductor Voltage (Vl_total)", yLabel: "Voltage (V)", traces: ["Vl_total"] },
    ],
  },
  "3-rlcc-series": {
    order: 3, // Restored to 3 for UI grouping
    label: "Series R-L-C-C",
    image: "3-rlcc-series.svg.png",
    params: ["V", "R", "L", "C1", "C2"],
    defaults: { V: 10, R: 10, L: 0.01, C1: 0.0001, C2: 0.0001, tEnd: 0.05, Freq: 1000 }, // L: mH, C: µF
    inputType: ["Step", "Ramp", "Sine"],
    solver: "solve3RlccSeries",
    metrics: ["riseTime", "settlingTime", "overshoot"],
    transferFunction: "1 / (s^2*L*C_eq + s*R*C_eq + 1)", // H(s) = V_C_total / V_in
    plots: [
        { title: "Circuit Current (i)", yLabel: "Current (A)", traces: ["i"] },
        { title: "Capacitor Voltages (Vc_total)", yLabel: "Voltage (V)", traces: ["Vc_total"] },
    ],
  },
};