/**
 * Gets the input voltage at a given time `t`.
 * @param {number} t - Current time.
 * @param {object} params - Parameters object containing V, inputType, Freq.
 * @returns {number} - The voltage of the source at time t.
 */
function getVin(t, params) {
  const { V, inputType, Freq } = params;
  
  switch (inputType) {
    case 'Step':
      return t >= 0 ? V : 0;
    case 'Sine':
      const w = 2 * Math.PI * Freq;
      return t >= 0 ? V * Math.sin(w * t) : 0;
    case 'Ramp': // V is treated as slope in V/s
      return t >= 0 ? V * t : 0;
    default:
      return 0;
  }
}

/**
 * State-space model for Series RC Circuit.
 * State: [Vc]
 * dVc/dt = (Vin - Vc) / (R * C)
 */
function rcOde(t, state, params) {
  const [Vc] = state;
  const { R, C } = params;
  const Vin = getVin(t, params);

  const dVc_dt = (Vin - Vc) / (R * C);
  return [dVc_dt];
}

/**
 * State-space model for Series RL Circuit.
 * State: [iL]
 * diL/dt = (Vin - iL*R) / L
 */
function rlOde(t, state, params) {
  const [iL] = state;
  const { R, L } = params;
  const Vin = getVin(t, params);

  const diL_dt = (Vin - iL * R) / L;
  return [diL_dt];
}

/**
 * State-space model for Series RLC Circuit.
 * State: [Vc, iL]
 * dVc/dt = iL / C
 * diL/dt = (Vin - Vc - iL*R) / L
 */
function rlcOde(t, state, params) {
  const [Vc, iL] = state;
  const { R, L, C } = params;
  const Vin = getVin(t, params);
  
  const dVc_dt = iL / C;
  const diL_dt = (Vin - Vc - iL * R) / L;
  
  return [dVc_dt, diL_dt];
}

/**
 * State-space model for 3rd Order R-L1-L2-C Circuit.
 * State: [Vc, iL1, iL2] (Assuming iL1 = iL2, it's a 2nd order R-(L1+L2)-C circuit)
 * Let's assume L1 and L2 are in series, so L_eq = L1 + L2
 * This is the same as the RLC circuit.
 */
function rllcOde(t, state, params) {
  const { R, L1, L2, C } = params;
  const L_eq = L1 + L2;
  return rlcOde(t, state, { ...params, L: L_eq });
}


/**
 * State-space model for 3rd Order R-L-C1-C2 Circuit.
 * State: [iL, Vc1, Vc2]
 * diL/dt = (Vin - Vc1 - Vc2 - iL*R) / L
 * dVc1/dt = iL / C1
 * dVc2/dt = iL / C2
 */
function rlccOde(t, state, params) {
  const [iL, Vc1, Vc2] = state;
  const { R, L, C1, C2 } = params;
  const Vin = getVin(t, params);

  const diL_dt = (Vin - Vc1 - Vc2 - iL * R) / L;
  const dVc1_dt = iL / C1;
  const dVc2_dt = iL / C2;
  
  return [diL_dt, dVc1_dt, dVc2_dt];
}
function rlcParallelOde(t, state, params) {
  const [Vc, iL] = state;
  const { R, L, C } = params;
  // We use getVin to get the input value, but treat it as a current I_in
  const I_in = getVin(t, params); 

  const dVc_dt = (I_in - Vc / R - iL) / C;
  const diL_dt = Vc / L;

  return [dVc_dt, diL_dt];
}
// Map solver keys to their respective ODE function and initial state
export const models = {
  solveRcCharge:    { func: rcOde,   initialState: [0],      map: (res) => ({ Vc: res.y0, i: res.time.map((t,i) => (getVin(t, res.params) - res.y0[i]) / res.params.R) }) },
  solveRcDischarge: { func: rcOde,   initialState: (p) => [p.V0], map: (res) => ({ Vc: res.y0, i: res.time.map(t => (-res.params.V0 / res.params.R) * Math.exp(-t / (res.params.R * res.params.C))) }) }, // Discharge is simpler analytically
  solveRlEnergize:  { func: rlOde,   initialState: [0],      map: (res) => ({ iL: res.y0, Vl: res.time.map((t, i) => getVin(t, res.params) - res.y0[i] * res.params.R) }) },
  solveRlDeEnergize: { func: rlOde,  initialState: (p) => [p.I0], map: (res) => ({ iL: res.y0, Vr: res.y0.map(i => -i * res.params.R) }) },
  solveRlcSeries:   { func: rlcOde,  initialState: [0, 0],   map: (res) => ({ Vc: res.y0, i: res.y1, Vl: res.time.map((t, i) => getVin(t, res.params) - res.y0[i] - res.y1[i] * res.params.R), Vr: res.y1.map(i => i * res.params.R) }) },
  solveRllcSeries:  { func: rllcOde, initialState: [0, 0],   map: (res) => ({ Vc: res.y0, i: res.y1, Vl_total: res.time.map((t, i) => getVin(t, res.params) - res.y0[i] - res.y1[i] * res.params.R), Vr: res.y1.map(i => i * res.params.R) }) },
  solve3RlccSeries: { func: rlccOde, initialState: [0, 0, 0], map: (res) => ({ i: res.y0, Vc1: res.y1, Vc2: res.y2, Vc_total: res.y1.map((v, i) => v + res.y2[i]), Vr: res.y0.map(i => i * res.params.R) }) },
  // Stubs for parallel
solveRlcParallel: { 
  func: rlcParallelOde, 
  initialState: [0, 0], 
  map: (res) => ({ 
    Vc: res.y0, 
    iL: res.y1, 
    // Calculate other branch currents based on the state variables
    iR: res.y0.map(v => v / res.params.R),
    iC: res.time.map((t, i) => (getVin(t, res.params) - res.y0[i] / res.params.R - res.y1[i]))
  }) 
},
};