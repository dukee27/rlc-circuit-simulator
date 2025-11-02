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
import { calculateMetrics, formatMetric } from '../simulation/metrics';

// Map metric keys to human-readable labels
const metricLabels = {
  riseTime: "Rise Time (10-90%)",
  settlingTime: "Settling Time (±2%)",
  overshoot: "Overshoot",
  peakValue: "Peak Value",
  peakTime: "Time to Peak",
};

function MetricsDisplay({ circuit, result, status }) {
  if (status !== 'complete' || !result || !circuit.metrics) {
    return null; // Don't render if no metrics to show
  }

  // Determine the primary trace and final value
  let primaryTrace, finalValue;
  if (circuit.id.includes('rl-energize')) {
    primaryTrace = 'iL';
    finalValue = result.finalValue;
  } else if (circuit.id.includes('rc-charge') || circuit.id.includes('rlc-series') || circuit.id.includes('rlc-parallel') || circuit.id.includes('rllc-series')) {
    primaryTrace = 'Vc';
    finalValue = result.finalValue;
  } else if (circuit.id.includes('discharge') || circuit.id.includes('deenergize')) {
    primaryTrace = circuit.id.includes('rc') ? 'Vc' : 'iL';
    finalValue = 0;
  } else {
    // No transient metrics defined for this trace
    return null;
  }

  const metrics = (primaryTrace && circuit.metrics)
    ? calculateMetrics(result, primaryTrace, finalValue, circuit.metrics)
    : {};

  const hasMetrics = Object.keys(metrics).length > 0;

  if (!hasMetrics) return null;

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Key Performance Metrics
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableBody>
            {Object.entries(metrics).map(([key, metric]) => (
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

export default MetricsDisplay;