import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import { formatMetric } from '../simulation/metrics';

// Map metric keys to human-readable labels
const metricLabels = {
  xl: "Inductive Reactance (Xʟ)",
  xc: "Capacitive Reactance (Xc)",
  g: "Conductance (G)",
  bl: "Inductive Susceptance (Bʟ)",
  bc: "Capacitive Susceptance (Bc)",
  y: "Admittance (Y)",
  z: "Impedance (Z)",
  theta: "Phase Angle (θ)",
};

/**
 * Calculates impedance metrics based on BASE unit params (H, F).
 */
function calculateImpedanceMetrics(params, circuitId) {
  try {
    const R = parseFloat(params.R) || 0;
    const f = parseFloat(params.Freq) || 0;

    if (circuitId.includes('rlc-parallel')) {
      const L = parseFloat(params.L) || 0; // Already in H
      const C = parseFloat(params.C) || 0; // Already in F
      if (!f || !R || !L || !C) return {};
      
      const w = 2 * Math.PI * f;
      const G = 1 / R;
      const B_L = 1 / (w * L);
      const B_C = w * C;
      const Y_mag = Math.sqrt(G**2 + (B_C - B_L)**2);
      const Z = 1 / Y_mag;
      let thetaRad = Math.atan((B_C - B_L) / G);
      if (R === 0) thetaRad = (B_C > B_L ? Math.PI / 2 : -Math.PI / 2);
      const thetaDeg = thetaRad * (180 / Math.PI);
      
      return {
        g: { value: G, unit: 'S' },
        bl: { value: B_L, unit: 'S' },
        bc: { value: B_C, unit: 'S' },
        y: { value: Y_mag, unit: 'S' },
        z: { value: Z, unit: 'Ω' },
        theta: { value: -thetaDeg, unit: '°' }, // Z angle is neg of Y
      };

    } else {
      // Handle all series-type RLC circuits
      let L = parseFloat(params.L) || 0; // Already in H
      let C = parseFloat(params.C) || 0; // Already in F

      if (circuitId.includes('rllc-series')) {
        L = (parseFloat(params.L1) || 0) + (parseFloat(params.L2) || 0);
        C = parseFloat(params.C) || 0;
      } else if (circuitId.includes('rlcc-series')) {
        L = parseFloat(params.L) || 0;
        const C1 = parseFloat(params.C1) || 0;
        const C2 = parseFloat(params.C2) || 0;
        if (C1 + C2 === 0) return {};
        C = (C1 * C2) / (C1 + C2);
      }

      if (!f || !R || !L || !C) return {};

      const w = 2 * Math.PI * f;
      const XL = w * L;
      const XC = 1 / (w * C);
      const Z = Math.sqrt(R**2 + (XL - XC)**2);
      
      let thetaRad = Math.atan((XL - XC) / R);
      if (R === 0) { // Handle division by zero
          if (XL > XC) thetaRad = Math.PI / 2;
          else if (XC > XL) thetaRad = -Math.PI / 2;
          else thetaRad = 0;
      }
      const thetaDeg = thetaRad * (180 / Math.PI);

      return {
        xl: { value: XL, unit: 'Ω' },
        xc: { value: XC, unit: 'Ω' },
        z: { value: Z, unit: 'Ω' },
        theta: { value: thetaDeg, unit: '°' },
      };
    }
  } catch (e) {
    console.error("Error calculating impedance:", e);
    return {};
  }
}

function ImpedanceDisplay({ status, params, inputType, circuitId }) {
  // Only show this component for completed Sine wave simulations
  if (status !== 'complete' || inputType !== 'Sine') {
    return null;
  }

  const impedanceMetrics = calculateImpedanceMetrics(params, circuitId);
  const hasMetrics = Object.keys(impedanceMetrics).length > 0;

  if (!hasMetrics) return null;

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Impedance Results
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableBody>
            {Object.entries(impedanceMetrics).map(([key, metric]) => (
              <TableRow key={key}>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="bold" color="text.primary">
                    {metricLabels[key] || key}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontFamily="monospace" color="secondary.main">
                    {formatMetric(metric)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default ImpedanceDisplay;