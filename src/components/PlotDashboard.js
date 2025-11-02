import React, { useState } from 'react';
import { Paper, Typography, Box, Grid, Tabs, Tab } from '@mui/material';
import Plot from 'react-plotly.js';

// Base layout using theme colors
const plotlyLayout = {
  autosize: true,
  margin: { l: 60, r: 40, b: 50, t: 50, pad: 4 },
  paper_bgcolor: 'rgba(0,0,0,0)', // Transparent paper
  plot_bgcolor: '#49637c', // Dark plot background (from theme.js)
  font: { color: '#ecf0f1' }, // Light text (from theme.js)
  legend: {
    orientation: 'h',
    y: -0.2,
    x: 0.5,
    xanchor: 'center',
  },
};

const getTimePlotData = (traces, result) => {
  return traces.map((traceName, index) => ({
    x: result.time,
    y: result[traceName],
    type: 'scatter',
    mode: 'lines',
    name: traceName,
    yaxis: (index > 0 && traces.length > 1 && traceName.toLowerCase() === 'i') ? 'y2' : 'y1',
  }));
};

// Updated layout to use dark theme colors
const getTimePlotLayout = (plotDef) => {
  const layout = {
    ...plotlyLayout,
    title: { text: plotDef.title, font: { size: 16, color: '#ecf0f1' } },
    xaxis: { title: 'Time (s)', gridcolor: '#34495e', color: '#ecf0f1', zerolinecolor: '#95a5a6', zerolinewidth: 2 },
    yaxis: { title: plotDef.yLabel, gridcolor: '#34495e', color: '#ecf0f1', zerolinecolor: '#95a5a6', zerolinewidth: 2 },
  };
  
  if (plotDef.yLabel2) {
    layout.yaxis2 = {
      title: plotDef.yLabel2,
      overlaying: 'y',
      side: 'right',
      gridcolor: '#34495e',
      color: '#ecf0f1',
      zeroline: false
    };
    layout.legend.y = -0.3;
  }
  return layout;
};

// Updated layout to use dark theme colors
const getBodePlotLayout = (title, yLabel) => ({
  ...plotlyLayout,
  title: { text: title, font: { size: 16, color: '#ecf0f1' } },
  xaxis: { title: 'Frequency (Hz)', type: 'log', gridcolor: '#34495e', color: '#ecf0f1' },
  yaxis: { title: yLabel, gridcolor: '#34495e', color: '#ecf0f1' },
});

// --- MODIFIED: Pole-Zero Plot Functions ---
const getPoleZeroData = (poles, zeros) => {
  const data = [];

  // Add Poles
  if (poles && poles.length > 0) {
    data.push({
      x: poles.map(p => p.re),
      y: poles.map(p => p.im),
      mode: 'markers',
      marker: { color: '#e74c3c', size: 16, symbol: 'x', line: { width: 3 } }, // Red 'x'
      name: 'Poles'
    });
  }

  // Add Zeros
  if (zeros && zeros.length > 0) {
    data.push({
      x: zeros.map(z => z.re),
      y: zeros.map(z => z.im),
      mode: 'markers',
      marker: { color: '#2ecc71', size: 16, symbol: 'circle-open', line: { width: 3 } }, // Green 'o'
      name: 'Zeros'
    });
  }
  
  return data;
};

const getPoleZeroLayout = () => ({
  ...plotlyLayout,
  title: { text: 'Pole-Zero Map', font: { size: 16, color: '#ecf0f1' } },
  xaxis: { 
    title: 'Real Axis (σ)', 
    gridcolor: '#34495e', 
    color: '#ecf0f1', 
    zeroline: true, 
    zerolinecolor: '#95a5a6', 
    zerolinewidth: 2,
    scaleanchor: "y", // Make it a 1:1 aspect ratio
    scaleratio: 1
  },
  yaxis: { 
    title: 'Imaginary Axis (jω)', 
    gridcolor: '#34495e', 
    color: '#ecf0f1', 
    zeroline: true, 
    zerolinecolor: '#95a5a6', 
    zerolinewidth: 2 
  },
  legend: { y: -0.3 },
  // Set aspect ratio to be square
  // This is handled by scaleanchor and scaleratio in xaxis now
});
// --- End of Modified Functions ---


function PlotDashboard({ circuit, result, status }) {
  const [tab, setTab] = useState(0);

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  if (status === 'ready' || status === 'running') {
    return (
      <Paper sx={{ p: 2, minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="textSecondary">
          {status === 'running' ? 'Generating plots...' : 'Run simulation to view results.'}
        </Typography>
      </Paper>
    );
  }

  if (!result || result.status !== 'complete') {
    return null; // Error is handled in App.js
  }
  
  // --- MODIFIED: Check for poles OR zeros ---
  const hasPoleZero = (result.poles && result.poles.length > 0) || (result.zeros && result.zeros.length > 0);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleChange} aria-label="analysis tabs">
          <Tab label="Time Domain" />
          <Tab label="Frequency Domain" />
          {hasPoleZero && <Tab label="Pole-Zero Plot" />}
        </Tabs>
      </Box>

      {/* --- Time Domain Plots --- */}
      <Box hidden={tab !== 0} sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {circuit.plots.map((plotDef, index) => (
            <Grid item xs={12} lg={circuit.plots.length > 1 ? 6 : 12} key={index}>
              <Box sx={{ border: '1px solid #34495e', borderRadius: 1 }}>
                <Plot
                  data={getTimePlotData(plotDef.traces, result)}
                  layout={getTimePlotLayout(plotDef)}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '400px' }}
                  config={{ responsive: true, displaylogo: false }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* --- Frequency Domain Plots (Bode) --- */}
      <Box hidden={tab !== 1} sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Magnitude Plot */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ border: '1px solid #34495e', borderRadius: 1 }}>
              <Plot
                data={[{
                  x: result.freq,
                  y: result.mag,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Magnitude',
                }]}
                layout={getBodePlotLayout('Magnitude Response', 'Magnitude (dB)')}
                useResizeHandler={true}
                style={{ width: '100%', height: '400px' }}
                config={{ responsive: true, displaylogo: false }}
              />
            </Box>
          </Grid>
          {/* Phase Plot */}
          <Grid item xs={12} lg={6}>
            <Box sx={{ border: '1px solid #34495e', borderRadius: 1 }}>
              <Plot
                data={[{
                  x: result.freq,
                  y: result.phase,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Phase',
                  line: { color: 'firebrick' }
                }]}
                layout={getBodePlotLayout('Phase Response', 'Phase (degrees)')}
                useResizeHandler={true}
                style={{ width: '100%', height: '400px' }}
                config={{ responsive: true, displaylogo: false }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* --- MODIFIED: Pole-Zero Plot --- */}
      {hasPoleZero && (
        <Box hidden={tab !== 2} sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8} sx={{ margin: 'auto' }}>
              <Box sx={{ border: '1px solid #34495e', borderRadius: 1 }}>
                <Plot
                  data={getPoleZeroData(result.poles, result.zeros)} 
                  layout={getPoleZeroLayout()}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '450px' }}
                  config={{ responsive: true, displaylogo: false }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

    </Paper>
  );
}

export default PlotDashboard;