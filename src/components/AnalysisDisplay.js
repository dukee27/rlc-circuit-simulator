//components/AnalysisDisplay.js
import React, { useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Grid,
} from '@mui/material';
import { calculateMetrics, formatMetric } from '../simulation/metrics';

// Helper for stability text color
const getStabilityColor = (status) => {
  if (status === 'Stable') return 'secondary.main'; // green
  if (status === 'Unstable') return 'error.main'; // red
  return 'warning.main'; // yellow
};

// Labels for the analysis table (UPDATED with MathJax)
const analysisLabels = {
  dampingRatio: "Damping Ratio ($\\zeta$)",
  natFreq: "Natural Freq ($f_0$)",
  timeConstant: "Time Constant ($\\tau$)",
  riseTime: "Rise Time (10-90%)",
  settlingTime: "Settling Time (±2%)",
  overshoot: "Overshoot (%OS)",
  peakValue: "Peak Value",
  peakTime: "Time to Peak ($t_p$)",
};

function AnalysisDisplay({ circuit, result, status }) {
  // useEffect hook to re-run MathJax when the result changes
  useEffect(() => {
    if (window.MathJax && status === 'complete' && (result?.tfString || result?.analysis)) {
      // Check if MathJax is available and we have a result
      window.MathJax.typesetPromise();
    }
  }, [result, status]); // Re-run when result or status change

  if (status !== 'complete' || !result) {
    return null; // Don't render if no data
  }

  const { analysis, stabilityStatus, tfString, finalValue } = result;
  
  // --- 1. Get Transient Metrics ---
  let primaryTrace;
  if (circuit.id.includes('rl-energize')) primaryTrace = 'iL';
  else if (circuit.id.includes('rc-charge') || circuit.id.includes('rlc-series') || circuit.id.includes('rlc-parallel') || circuit.id.includes('rllc-series') || circuit.id.includes('rlcc-series')) primaryTrace = 'Vc';
  else if (circuit.id.includes('discharge') || circuit.id.includes('deenergize')) primaryTrace = circuit.id.includes('rc') ? 'Vc' : 'iL';

  const transientMetrics = (primaryTrace && circuit.metrics)
    ? calculateMetrics(result, primaryTrace, finalValue, circuit.metrics)
    : {};

  // --- 2. Build Analysis Data Object ---
  const analysisData = {};

  // Parse analysis string for Damping Ratio and Nat Freq
  if (analysis) {
    // UPDATED Regex to find the MathJax labels
    if (analysis.includes('Damping Ratio')) {
      const dampingMatch = analysis.match(/Damping Ratio \(\$\\zeta\$\): (.*?) \(/);
      const freqMatch = analysis.match(/Natural Freq \(\$f_0\$\): (.*? Hz)/);
      if (dampingMatch) analysisData.dampingRatio = dampingMatch[1];
      if (freqMatch) analysisData.natFreq = freqMatch[1];
    }
    if (analysis.includes('Time Constant')) {
      const tauMatch = analysis.match(/Time Constant \(\$\\tau\$\): (.*)/);
      if (tauMatch) analysisData.timeConstant = tauMatch[1];
    }
  }

  // Add transient metrics to the list
  Object.entries(transientMetrics).forEach(([key, metric]) => {
    analysisData[key] = formatMetric(metric);
  });
  
  const hasAnalysisData = Object.keys(analysisData).length > 0;
  
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        System Analysis
      </Typography>
      
      {/* Transfer Function Display */}
      {tfString && (
        <Box
          id="tf-display"
          sx={{
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            border: '1px solid #3498db',
            borderRadius: 2,
            padding: 2,
            margin: '8px 0 16px',
            textAlign: 'center',
            color: 'text.primary',
            fontSize: '1.2em',
            overflowX: 'auto'
          }}
        >
          {/* This inner div is what MathJax will typeset */}
          <div>{result.tfString}</div>
        </Box>
      )}
      
      {/* --- UPDATED: Combined Analysis Table --- */}
      <Grid container spacing={2}>
        {/* Stability Status */}
        {stabilityStatus && (
          <Grid item xs={12} sm={6} md={5}>
            {/* --- FIXED: Moved Typography inside --- */}
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 1, 
              bgcolor: 'rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              height: '100%' // Make boxes same height
            }}>
              <Typography variant="body2" fontWeight="bold" color="text.primary" gutterBottom>
                Stability
              </Typography>
              <Typography 
                variant="body2" 
                fontFamily="monospace" 
                fontWeight="bold"
                color={getStabilityColor(stabilityStatus.status)}
              >
                {stabilityStatus.status}
              </Typography>
              <Typography variant="caption" display="block" fontFamily="monospace">
                {stabilityStatus.details}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Other Analysis Metrics */}
        {hasAnalysisData && (
          <Grid item xs={12} sm={6} md={stabilityStatus ? 7 : 12}>
            {/* --- FIXED: Added matching Typography title --- */}
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 1, 
              bgcolor: 'rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              height: '100%'
            }}>
              <Typography variant="body2" fontWeight="bold" color="text.primary" gutterBottom>
                Analysis & Metrics
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {Object.entries(analysisData).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell component="th" scope="row" sx={{ width: '50%', border: 'none', p: 0.5, py: 0.2 }}>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {/* This will now be typeset by MathJax */}
                            {analysisLabels[key] || key}
                          </Typography>
                        </TableCell>
                        <TableCell align="left" sx={{ border: 'none', p: 0.5, py: 0.2 }}>
                          <Typography variant="body2" fontFamily="monospace" color="secondary.main">
                            {value}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}

export default AnalysisDisplay;