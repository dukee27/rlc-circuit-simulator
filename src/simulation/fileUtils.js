// src/simulation/fileUtils.js

import { calculateMetrics, formatMetric } from './metrics'; // Import helpers

/**
 * Triggers a browser download for a JSON object.
 * @param {object} data - The configuration object to save.
 * @param {string} filename - The desired filename (e.g., "config.json").
 */
export function saveConfigToFile(data, filename = 'circuit-config.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

/**
 * Triggers a browser download for the simulation result data as a CSV.
 * @param {object} result - The simulation result object { time, Vc, i, ... }.
 * @param {string} filename - The desired filename (e.g., "results.csv").
 */
export function exportResultsToCSV(result, filename = 'simulation-results.csv') {
  if (!result || !result.time) {
    throw new Error('No result data to export.');
  }

  // Find all array keys (e.g., time, Vc, i, freq, mag, phase)
  const keys = Object.keys(result).filter(k => Array.isArray(result[k]));
  const header = keys.join(',') + '\n';
  
  let csv = header;
  
  // Find the longest array to set the number of rows
  const numRows = Math.max(...keys.map(k => result[k].length));

  // Iterate row by row
  for (let i = 0; i < numRows; i++) {
    csv += keys.map(key => (result[key][i] !== undefined ? result[key][i] : '')).join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

// --- NEW: HTML Report Generator ---

// Helper to get units for the report
const getUnit = (paramName) => {
  if (paramName.startsWith('R')) return 'Ω';
  if (paramName.startsWith('L')) return 'mH';
  if (paramName.startsWith('C')) return 'µF';
  if (paramName.startsWith('V') && paramName !== 'V0') return 'V';
  if (paramName === 'V0') return 'V';
  if (paramName === 'Slope') return 'V/s';
  if (paramName.startsWith('I')) return 'A';
  if (paramName === 'tEnd') return 's';
  if (paramName === 'Freq') return 'Hz';
  return '';
};

// Helper to format a metric for the HTML report
function formatMetricForReport(metric) {
  if (!metric || typeof metric.value !== 'number') return 'N/A';
  // Use formatMetric from metrics.js
  return formatMetric(metric);
}

// Helper to generate an HTML table row
const tr = (th, td) => `<tr><th>${th}</th><td>${td}</td></tr>`;

/**
 * Generates and downloads a detailed HTML simulation report.
 * @param {object} circuit - The circuit definition object.
 * @param {object} params - The UI parameters (with mH, µF).
 * @param {object} result - The simulation result object.
 * @param {string} inputType - The type of simulation (e.g., "Step", "Sine").
 */
export function exportReportToHTML(circuit, params, result, inputType) {
  if (!result || result.status !== 'complete') {
    throw new Error('No result data to export.');
  }
  
  const { analysis, stabilityStatus, tfString, finalValue } = result;

  // --- 1. Build Parameter Table ---
  let paramRows = '';
  paramRows += tr('Input Type', inputType);
  paramRows += tr('Simulation Time', `${params.tEnd} s`);
  if (inputType === 'Sine') {
    paramRows += tr('Frequency (f)', `${params.Freq} Hz`);
  }
  
  circuit.params.forEach(paramKey => {
    let label = paramKey;
    if (paramKey === 'V' && inputType === 'Sine') label = 'V (Amplitude)';
    if (paramKey === 'V' && inputType === 'Ramp') label = 'Slope';
    if (paramKey === 'V0') label = 'V (Initial)';
    if (paramKey === 'I0') label = 'I (Initial)';
    
    const unit = (getUnit(label) || '');
    // params are already in UI units
    paramRows += tr(`${label}`, `${params[paramKey]} ${unit}`); 
  });

  // --- 2. Build Analysis Table ---
  let analysisRows = '';
  if (stabilityStatus) {
    analysisRows += tr('Stability', `<b>${stabilityStatus.status}</b> (${stabilityStatus.details})`);
  }
  if (analysis) {
    analysis.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        analysisRows += tr(parts[0], parts[1].trim());
      }
    });
  }

  // --- 3. Build Transient Metrics Table ---
  let transientRows = '';
  let primaryTrace;
  if (circuit.id.includes('rl-energize')) primaryTrace = 'iL';
  else if (circuit.id.includes('rc-charge') || circuit.id.includes('rlc-series') || circuit.id.includes('rlc-parallel') || circuit.id.includes('rllc-series') || circuit.id.includes('rlcc-series')) primaryTrace = 'Vc';
  if (circuit.id.includes('discharge') || circuit.id.includes('deenergize')) primaryTrace = circuit.id.includes('rc') ? 'Vc' : 'iL';

  const transientMetrics = (primaryTrace && circuit.metrics)
    ? calculateMetrics(result, primaryTrace, finalValue, circuit.metrics)
    : {};
  
  // UPDATED with MathJax
  const transientLabels = { riseTime: "Rise Time (10-90%)", settlingTime: "Settling Time (±2%)", overshoot: "Overshoot (%OS)", peakValue: "Peak Value", peakTime: "Time to Peak ($t_p$)" };
  Object.entries(transientMetrics).forEach(([key, metric]) => {
    transientRows += tr(transientLabels[key] || key, formatMetricForReport(metric));
  });

  // --- 4. Build Impedance Table (FIXED + MathJax) ---
  let impedanceRows = '';
  if (inputType === 'Sine' && params.Freq) {
    const R = (parseFloat(params.R) || 0);
    const f = (parseFloat(params.Freq) || 0);
    const w = 2 * Math.PI * f;

    if (f > 0 && R > 0) {
      if (circuit.id.includes('rlc-parallel')) {
        const L = (parseFloat(params.L) || 0) / 1000; // mH -> H
        const C = (parseFloat(params.C) || 0) / 1000000; // µF -> F
        if (L > 0 && C > 0) {
          const G = 1 / R;
          const B_L = 1 / (w * L);
          const B_C = w * C;
          const Y_mag = Math.sqrt(G**2 + (B_C - B_L)**2);
          const Z = 1 / Y_mag;
          let thetaRad = Math.atan((B_C - B_L) / G);
          if (R === 0) thetaRad = (B_C > B_L ? Math.PI / 2 : -Math.PI / 2);
          const thetaDeg = thetaRad * (180 / Math.PI);
          
          impedanceRows += tr("Conductance ($G$)", `${G.toFixed(3)} S`);
          impedanceRows += tr("Inductive Susceptance ($B_L$)", `${B_L.toFixed(3)} S`);
          impedanceRows += tr("Capacitive Susceptance ($B_C$)", `${B_C.toFixed(3)} S`);
          impedanceRows += tr("Admittance ($Y$)", `${Y_mag.toFixed(3)} S`);
          impedanceRows += tr("Impedance ($Z$)", `${Z.toFixed(3)} Ω`);
          impedanceRows += tr("Phase Angle ($\\theta$)", `${-thetaDeg.toFixed(3)} °`);
        }
      } else {
        // Handle all Series-like circuits
        let L_eq = (parseFloat(params.L) || 0) / 1000; // mH -> H
        let C_eq = (parseFloat(params.C) || 0) / 1000000; // µF -> F

        if (circuit.id.includes('rllc-series')) {
          L_eq = (parseFloat(params.L1 || 0) / 1000) + (parseFloat(params.L2 || 0) / 1000);
        }
        if (circuit.id.includes('rlcc-series')) {
          const C1_F = (parseFloat(params.C1 || 0) / 1000000);
          const C2_F = (parseFloat(params.C2 || 0) / 1000000);
          if(C1_F + C2_F > 0) {
            C_eq = (C1_F * C2_F) / (C1_F + C2_F);
          } else {
            C_eq = 0;
          }
        }
        
        if (L_eq > 0 && C_eq > 0) {
          const XL_eff = w * L_eq;
          const XC_eff = 1 / (w * C_eq);
          const Z = Math.sqrt(R**2 + (XL_eff - XC_eff)**2);
          let thetaRad = Math.atan((XL_eff - XC_eff) / R);
          if (R === 0) thetaRad = (XL_eff > XC_eff ? Math.PI / 2 : -Math.PI / 2);
          const thetaDeg = thetaRad * (180 / Math.PI);
          
          impedanceRows += tr("Inductive Reactance ($X_L$)", `${XL_eff.toFixed(3)} Ω`);
          impedanceRows += tr("Capacitive Reactance ($X_C$)", `${XC_eff.toFixed(3)} Ω`);
          impedanceRows += tr("Impedance ($Z$)", `${Z.toFixed(3)} Ω`);
          impedanceRows += tr("Phase Angle ($\\theta$)", `${thetaDeg.toFixed(3)} °`);
        }
      }
    }
  }


  // --- 5. Generate HTML String ---
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Simulation Report: ${circuit.label}</title>
      
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; color: #333; }
        .container { max-width: 800px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        h1, h2 { color: #1a237e; border-bottom: 2px solid #3498db; padding-bottom: 8px; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background-color: #f9f9f9; font-weight: 600; width: 40%; }
        td { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; color: #00796b; font-weight: 500; }
        td b { color: #d32f2f; }
        .circuit-img { max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 4px; display: block; margin: 15px auto; background-color: #fff; }
        .tf-box { background-color: #f0f6ff; border: 1px solid #3498db; border-radius: 4px; padding: 15px; margin: 15px 0; font-size: 1.2em; text-align: center; color: #1a237e; overflow-x: auto; }
        .footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Simulation Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        
        <h2>Circuit: ${circuit.label}</h2>
        <img src="${window.location.origin}${process.env.PUBLIC_URL}/images/${circuit.image}" alt="${circuit.label}" class="circuit-img" />
        
        <h2>Input Parameters</h2>
        <table><tbody>${paramRows}</tbody></table>
        
        ${tfString ? `<h2>Transfer Function</h2><div class="tf-box">${tfString}</div>` : ''}

        ${analysisRows ? `<h2>System Analysis</h2><table><tbody>${analysisRows}</tbody></table>` : ''}
        
        ${transientRows ? `<h2>Transient Performance Metrics</h2><table><tbody>${transientRows}</tbody></table>` : ''}
        
        ${impedanceRows ? `<h2>Impedance Analysis</h2><table><tbody>${impedanceRows}</tbody></table>` : ''}

        <div class="footer">Report generated by RLC Circuit Simulator</div>
      </div>

      <script>
        window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] } };
      </script>
      <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    </body>
    </html>
  `;

  // --- 6. Trigger Download ---
  const blob = new Blob([html], { type: 'text/html' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `report-${circuit.id}-${inputType}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}