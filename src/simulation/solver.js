import { solveODE } from './numericalSolver';
import { models } from './stateSpaceModels';

// --- Frequency Response (Bode Plot) Solver ---

/**
 * Generates a logarithmically spaced frequency vector.
 * @param {number} [fMin=1] - Minimum frequency (Hz).
 * @param {number} [fMax=1e6] - Maximum frequency (Hz).
 * @param {number} [points=500] - Number of points.
 * @returns {number[]} - The frequency array.
 */
function generateFrequencyVector(fMin = 1, fMax = 1e6, points = 500) {
  const logMin = Math.log10(fMin);
  const logMax = Math.log10(fMax);
  const logStep = (logMax - logMin) / (points - 1);
  const freq = new Array(points);
  for (let i = 0; i < points; i++) {
    freq[i] = Math.pow(10, logMin + i * logStep);
  }
  return freq;
}

function solveFrequencyResponse(circuit, params) {
  const { R, L, C, L1, L2, C1, C2 } = params;
  const freq = generateFrequencyVector();
  const omega = freq.map(f => 2 * Math.PI * f);

  let mag = new Array(freq.length).fill(0);
  let phase = new Array(freq.length).fill(0);

  // Complex number math helpers
  const cAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  
  const cDiv = (a, b) => {
    const [ar, ai] = a;
    const [br, bi] = b;
    const den = br * br + bi * bi;
    if (den === 0) return [0, 0]; // Avoid division by zero
    return [
      (ar * br + ai * bi) / den, // Real part
      (ai * br - ar * bi) / den  // Imaginary part
    ];
  };
  const cMag = (a) => Math.sqrt(a[0]**2 + a[1]**2);
  
  const cPhase = (a) => Math.atan2(a[1], a[0]);

  try {
    switch (circuit.transferFunction) {
      case '1 / (1 + sRC)': // RC Low-pass (Vc)
        omega.forEach((w, i) => {
          const H = cDiv([1, 0], [1, w * R * C]);
          mag[i] = 20 * Math.log10(cMag(H));
          phase[i] = cPhase(H) * 180 / Math.PI;
        });
        break;
      
      case 'R / (R + sL)': // RL Low-pass (Vr)
        omega.forEach((w, i) => {
          const H = cDiv([R, 0], [R, w * L]);
          mag[i] = 20 * Math.log10(cMag(H));
          phase[i] = cPhase(H) * 180 / Math.PI;
        });
        break;

      case '(sRC) / (s^2LC + sRC + 1)': // Series RLC (Vr - Band-pass)
        omega.forEach((w, i) => {
          const s_sq_LC = [-1*w**2 * L * C, 0];
          const s_RC = [0, w * R * C];
          const H_num = s_RC;
          const H_den = cAdd(cAdd(s_sq_LC, s_RC), [1, 0]);
          const H = cDiv(H_num, H_den);
          mag[i] = 20 * Math.log10(cMag(H));
          phase[i] = cPhase(H) * 180 / Math.PI;
        });
        break;
      
      case 'sL / (s^2LC + sL/R + 1)': // Parallel RLC (V/I_in)
        omega.forEach((w, i) => {
          const H_num = [0, w * L]; // sL
          const H_den = [1 - w**2 * L * C, w * L / R]; // 1 - w^2*LC + j*w*L/R
          const H = cDiv(H_num, H_den);
          mag[i] = 20 * Math.log10(cMag(H));
          phase[i] = cPhase(H) * 180 / Math.PI;
        });
        break;
      
      case '1 / (s^2*C*(L1+L2) + s*C*R + 1)': // R-L1-L2-C (Vc)
        {
          const L_eq = L1 + L2;
          omega.forEach((w, i) => {
            const H_den = [1 - w**2 * L_eq * C, w * R * C];
            const H_num = [1, 0];
            const H = cDiv(H_num, H_den);
            mag[i] = 20 * Math.log10(cMag(H));
            phase[i] = cPhase(H) * 180 / Math.PI;
          });
        }
        break;
      
      case '1 / (s^2*L*C_eq + s*R*C_eq + 1)': // R-L-C1-C2 (Vc_total)
        {
          const C_eq = (C1 * C2) / (C1 + C2);
          omega.forEach((w, i) => {
            const H_den = [1 - w**2 * L * C_eq, w * R * C_eq];
            const H_num = [1, 0];
            const H = cDiv(H_num, H_den);
            mag[i] = 20 * Math.log10(cMag(H));
            phase[i] = cPhase(H) * 180 / Math.PI;
          });
        }
        break;

      default:
        if (circuit.transferFunction) {
           console.warn(`Unimplemented transfer function for Bode: ${circuit.transferFunction}`);
        }
        mag.fill(0);
        phase.fill(0);
    }
    return { freq, mag, phase, status: 'complete' };
  } catch (e) {
    console.error('Bode plot calculation error:', e);
    return { status: 'error', message: 'Bode plot calculation failed.' };
  }
}

/**
 * Calculates poles and assesses stability for 2nd-order systems.
 */
function calculatePolesAndStability(params) {
  const { R, L, C } = params;
  
  if (!L || !C || L <= 0 || C <= 0) {
    return { poles: [], stabilityStatus: { status: "N/A", details: "L or C is zero or negative." } };
  }

  // Standard 2nd order form: s^2 + (R/L)s + 1/(LC) = 0
  const b = R / L;
  const c = 1 / (L * C);
  
  const disc = b * b - 4 * c; // Discriminant
  let roots = [];

  if (disc >= 0) {
      const r1 = (-b + Math.sqrt(disc)) / 2;
      const r2 = (-b - Math.sqrt(disc)) / 2;
      roots = [{ re: r1, im: 0 }, { re: r2, im: 0 }];
  } else {
      const realPart = -b / 2;
      const imagPart = Math.sqrt(-disc) / 2;
      roots = [{ re: realPart, im: imagPart }, { re: realPart, im: -imagPart }];
  }

  // Assess stability
  let stabilityStatus = { status: "Stable", details: "All poles Re(p) < 0." };
  const tol = 1e-9;
  
  let hasUnstablePole = false;
  for (const p of roots) {
    if (p.re > tol) {
      stabilityStatus = { status: "Unstable", details: "At least one pole with Re(p) > 0." };
      hasUnstablePole = true;
      break;
    }
  }

  if (!hasUnstablePole) {
    const imagAxisPoles = roots.filter(p => Math.abs(p.re) <= tol);
    if (imagAxisPoles.length > 0) {
      const isRepeated = imagAxisPoles.length > 1 && (
        (Math.abs(imagAxisPoles[0].im - imagAxisPoles[1].im) < tol) ||
        (Math.abs(imagAxisPoles[0].im + imagAxisPoles[1].im) < tol)
      );
      
      if (isRepeated) {
        stabilityStatus = { status: "Unstable", details: "Repeated poles on imaginary axis." };
      } else {
        stabilityStatus = { status: "Marginally Stable", details: "Simple poles on imaginary axis (oscillatory)." };
      }
    }
  }

  return { poles: roots, stabilityStatus };
}


// --- Main Solver Router ---

export function solve(circuit, params) {
  const model = models[circuit.solver];

  if (!model || typeof model.func !== 'function') {
    return { status: 'unimplemented', message: 'This circuit solver is not yet implemented.' };
  }

  // Validate params
  for (const param of circuit.params) {
    if (params[param] === undefined || isNaN(params[param])) {
      return { status: 'error', message: `Invalid or missing parameter: ${param}` };
    }
  }

  try {
    // --- 1. Run Time-Domain Simulation ---
    let initialState = (typeof model.initialState === 'function')
      ? model.initialState(params)
      : model.initialState;
      
    const odeResults = solveODE(model.func, initialState, params, 0, params.tEnd);
    
    const timeDomain = model.map({ ...odeResults, params });

    // --- 2. Run Frequency-Domain Simulation ---
    const freqDomain = solveFrequencyResponse(circuit, params);
    if (freqDomain.status === 'error') return freqDomain;

    // --- 3. Generate Analysis & Final Value ---
    let analysis = "";
    let finalValue = 0;
    let poles = null;
    let zeros = []; // <-- MODIFIED: Initialize zeros array
    let stabilityStatus = null;
    let tfString = null;
    
    // --- UPDATED: Handle different 2nd order L/C combinations ---
    if (circuit.order === 2 || circuit.order === 3) { // Handle 2nd and "3rd" (which are 2nd)
      let R_eq = params.R;
      let L_eq = params.L;
      let C_eq = params.C;
      
      if (circuit.id.includes('rllc-series')) {
        L_eq = params.L1 + params.L2;
      } else if (circuit.id.includes('rlcc-series')) {
        L_eq = params.L;
        if(params.C1 + params.C2 > 0) {
          C_eq = (params.C1 * params.C2) / (params.C1 + params.C2);
        } else {
          C_eq = 0;
        }
      } else if (circuit.id.includes('rlc-parallel')) {
        // Parallel RLC poles are different: s^2 + (1/RC)s + 1/LC = 0
        if (R_eq > 0 && L_eq > 0 && C_eq > 0) {
          const b_p = 1 / (R_eq * C_eq);
          const c_p = 1 / (L_eq * C_eq);
          const disc_p = b_p * b_p - 4 * c_p;
          
          if (disc_p >= 0) {
              const r1 = (-b_p + Math.sqrt(disc_p)) / 2;
              const r2 = (-b_p - Math.sqrt(disc_p)) / 2;
              poles = [{ re: r1, im: 0 }, { re: r2, im: 0 }];
          } else {
              const realPart = -b_p / 2;
              const imagPart = Math.sqrt(-disc_p) / 2;
              poles = [{ re: realPart, im: imagPart }, { re: realPart, im: -imagPart }];
          }
          // Manually run stability check for parallel
          stabilityStatus = { status: "Stable", details: "All poles Re(p) < 0." };
          if (poles.some(p => p.re > 1e-9)) {
            stabilityStatus = { status: "Unstable", details: "At least one pole with Re(p) > 0." };
          }
          
          // Analysis string for parallel (UPDATED with MathJax)
          const zeta_p = (1 / (2 * R_eq)) * Math.sqrt(L_eq / C_eq);
          const omega0_p = 1 / Math.sqrt(L_eq / C_eq);
          analysis = `Damping Ratio (\\(\\zeta\\)): ${zeta_p.toFixed(3)} (${zeta_p > 1 ? 'Overdamped' : zeta_p === 1 ? 'Critically Damped' : 'Underdamped'})\nNatural Freq (\\(f_0\\)): ${(omega0_p / (2 * Math.PI)).toFixed(2)} Hz`;
        }
      }

      // For all SERIES 2nd order circuits
      if (!circuit.id.includes('rlc-parallel') && R_eq > 0 && L_eq > 0 && C_eq > 0) {
        const pzAnalysis = calculatePolesAndStability({ R: R_eq, L: L_eq, C: C_eq });
        poles = pzAnalysis.poles;
        stabilityStatus = pzAnalysis.stabilityStatus;
        
        const alpha = R_eq / (2 * L_eq);
        const omega0 = 1 / Math.sqrt(L_eq * C_eq);
        const zeta = alpha / omega0;
        // UPDATED with MathJax
        analysis = `Damping Ratio (\\(\\zeta\\)): ${zeta.toFixed(3)} (${zeta > 1 ? 'Overdamped' : zeta === 1 ? 'Critically Damped' : 'Underdamped'})\nNatural Freq (\\(f_0\\)): ${(omega0 / (2 * Math.PI)).toFixed(2)} Hz`;
      }

      // --- ADDED: Zeros calculation based on circuit.transferFunction from circuitDefinitions.js ---
      // This is what the Bode plot uses and determines what is being "measured".
      if (circuit.transferFunction === '(sRC) / (s^2LC + sRC + 1)') { // Series RLC (measuring Vr)
        zeros = [{ re: 0, im: 0 }];
      } else if (circuit.transferFunction === 'sL / (s^2LC + sL/R + 1)') { // Parallel RLC (measuring V)
        zeros = [{ re: 0, im: 0 }];
      }
      // Note: other TFs like '1 / (1 + sRC)' have no zeros, so the `zeros` array remains empty.

      // --- Generate Transfer Function String ---
      // --- MODIFIED: New formatCoeff function to avoid 'e' notation ---
      const formatCoeff = (n) => {
        if (n === 0) return '0';
        if (n === 1) return '1';
        
        const absN = Math.abs(n);

        if (absN < 1e-3 && absN > 0) { // For very small numbers like e-4, e-7
          let s = n.toFixed(10); // Get high precision
          s = s.replace(/0+$/, ''); // Remove trailing zeros
          if (s.endsWith('.')) s = s.slice(0, -1); // Remove trailing decimal
          return s;
        }
        
        if (absN < 1 && absN > 0) { // For small-ish numbers like 0.004
          // Round to 6 decimals, then convert to string (which drops trailing zeros)
          return String(parseFloat(n.toFixed(6)));
        }

        if (absN > 1e6) { // For large numbers, scientific is ok
          return n.toExponential(2);
        }

        // For numbers >= 1
        return String(parseFloat(n.toFixed(4)));
      };
      // --- END: New formatCoeff function ---
      
      if (circuit.id.includes('rlc-series')) {
        const a = params.L * params.C;
        const b = params.R * params.C;
        // This TF is for Vc(s).
        // Let's check the transferFunction from circuitDefs to decide what to show
        if (circuit.transferFunction === '(sRC) / (s^2LC + sRC + 1)') {
          // TF for Vr(s)
          const k = params.R * params.C;
          tfString = `$$H(s) = \\frac{V_r(s)}{V_{in}(s)} = \\frac{${formatCoeff(k)} s}{${formatCoeff(a)} s^2 + ${formatCoeff(b)} s + 1}$$`;
        } else {
          // Default to Vc(s)
          tfString = `$$H(s) = \\frac{V_c(s)}{V_{in}(s)} = \\frac{1}{${formatCoeff(a)} s^2 + ${formatCoeff(b)} s + 1}$$`;
        }
      } else if (circuit.id.includes('rllc-series')) {
        const a = (params.L1 + params.L2) * params.C;
        const b = params.R * params.C;
        tfString = `$$H(s) = \\frac{V_c(s)}{V_{in}(s)} = \\frac{1}{${formatCoeff(a)} s^2 + ${formatCoeff(b)} s + 1}$$`;
      } else if (circuit.id.includes('rlcc-series')) {
        const C_eq_s = (params.C1 + params.C2 > 0) ? (params.C1 * params.C2) / (params.C1 + params.C2) : 0;
        const a = params.L * C_eq_s;
        const b = params.R * C_eq_s;
        tfString = `$$H(s) = \\frac{V_c(s)}{V_{in}(s)} = \\frac{1}{${formatCoeff(a)} s^2 + ${formatCoeff(b)} s + 1}$$`;
      } else if (circuit.id.includes('rlc-parallel')) {
        const a = params.L * params.C;
        const b = params.L / params.R;
        const k = params.L;
        // This TF is V(s) / I_in(s) = sL / (s^2*LC + s*L/R + 1)
        tfString = `$$H(s) = \\frac{V(s)}{I_{in}(s)} = \\frac{${formatCoeff(k)} s}{${formatCoeff(a)} s^2 + ${formatCoeff(b)} s + 1}$$`;
      }

    } else if (circuit.order === 1 && params.R > 0) {
        const tau = params.C ? params.R * params.C : (params.L / params.R);
        // UPDATED with MathJax
        analysis = `Time Constant (\\(\\tau\\)): ${(tau * 1000).toFixed(2)} ms`;
    }

    if (params.inputType === 'Step') {
        if (circuit.id.includes('rc-charge') || circuit.id.includes('rlc-series') || circuit.id.includes('rllc-series') || circuit.id.includes('rlcc-series')) finalValue = params.V;
        if (circuit.id.includes('rl-energize')) finalValue = params.R > 0 ? params.V / params.R : 0;
        if (circuit.id.includes('rlc-parallel')) finalValue = params.V * params.R; // V is I_in, so I_in * R
    }
    
    // Combine all results
    return { 
      ...timeDomain, 
      time: odeResults.time,
      freq: freqDomain.freq, 
      mag: freqDomain.mag, 
      phase: freqDomain.phase,
      analysis,
      finalValue,
      poles,
      zeros, // <-- MODIFIED: Pass zeros array
      stabilityStatus,
      tfString,
      status: 'complete'
    };

  } catch (e) {
    console.error(e);
    return { status: 'error', message: `Calculation error: ${e.message}` };
  }
}