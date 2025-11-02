import React, { useState, useMemo } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { circuitDefinitions } from './simulation/circuitDefinitions';
import { solve } from './simulation/solver';
import { useLogger } from './hooks/useLogger';
import { exportResultsToCSV, exportReportToHTML } from './simulation/fileUtils';
import ControlPanel from './components/ControlPanel';
import SimulationDisplay from './components/SimulationDisplay';
import PlotDashboard from './components/PlotDashboard';
import LogConsole from './components/LogConsole';
// import MetricsDisplay from './components/MetricsDisplay'; // This component is deleted
import AnalysisDisplay from './components/AnalysisDisplay';
import ImpedanceDisplay from './components/ImpedanceDisplay';

// --- REMOVED: convertDefaultsToSolver function (no longer needed) ---

// --- NEW: Helper to convert base units to UI units for report ---
const convertSolverToUI = (params) => {
  const uiParams = {};
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (key.startsWith('L')) {
      uiParams[key] = value * 1000; // H -> mH
    } else if (key.startsWith('C')) {
      uiParams[key] = value * 1000000; // F -> µF
    } else {
      uiParams[key] = value;
    }
  });
  return uiParams;
}

function App() {
  const [circuitId, setCircuitId] = useState('1-rc-charge');
  const [inputType, setInputType] = useState('Step');
  
  // --- UPDATED: State now stores params in BASE UNITS (H, F, etc.) ---
  // The defaults in circuitDefinitions are already in base units.
  const [params, setParams] = useState(
    circuitDefinitions['1-rc-charge'].defaults
  );
  
  const [simStatus, setSimStatus] = useState('ready'); // ready, running, complete, error
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState(null);
  const { logs, addLog } = useLogger();

  const currentCircuit = useMemo(
    () => ({
      ...circuitDefinitions[circuitId],
      id: circuitId,
    }),
    [circuitId]
  );

  // --- UPDATED: Load defaults directly (they are already base units) ---
  const handleCircuitChange = (newId) => {
    if (!newId || !circuitDefinitions[newId]) return;
    const newCircuit = circuitDefinitions[newId];
    setCircuitId(newId);
    setParams(newCircuit.defaults); // Already in base units
    setInputType(newCircuit.inputType[0]); 
    setSimResult(null);
    setSimError(null);
    setSimStatus('ready');
    addLog(`Circuit changed to: ${newCircuit.label}`);
  };

  // --- UPDATED: `value` is already in base units from ControlPanel ---
  const handleParamChange = (name, value) => {
    setParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- UPDATED: Load defaults directly (they are already base units) ---
  const handleInputTypeChange = (newType) => {
    setInputType(newType);
    const newDefaults = circuitDefinitions[circuitId].defaults;
    
    // Special logic for V (which is a base unit)
    if (newType === 'Sine' && params.V === 10) {
      newDefaults.V = 1;
    } else if (newType !== 'Sine' && params.V === 1) {
      newDefaults.V = 10;
    } else {
      newDefaults.V = params.V; // Keep current V if not default
    }

    setParams(newDefaults);
    setSimResult(null);
    setSimError(null);
    setSimStatus('ready');
  };

  const handleSimulate = (solverParams) => {
    setSimStatus('running');
    setSimResult(null);
    setSimError(null);
    addLog(`Running ${inputType} simulation for ${currentCircuit.label}...`);

    setTimeout(() => {
      // solverParams are already in base units
      const result = solve(currentCircuit, solverParams); 

      if (result.status === 'complete') {
        setSimResult(result);
        setSimStatus('complete');
        addLog('Simulation complete.');
        if(result.analysis) {
          addLog(`Analysis: ${result.analysis.replace(/\n/g, ' | ')}`);
        }
      } else {
        setSimStatus('error');
        setSimError(result.message);
        addLog(`Error: ${result.message}`);
      }
    }, 500); 
  };

  // --- UPDATED: `config.params` are now base units from ControlPanel ---
  const handleConfigLoad = (config) => {
    setCircuitId(config.circuitId);
    setInputType(config.inputType);
    setParams(config.params); // Already in base units
    setSimResult(null);
    setSimError(null);
    setSimStatus('ready');
    addLog(`Loaded configuration for ${circuitDefinitions[config.circuitId].label}.`);
  };

  const handleExportCSV = () => {
    if (simResult) {
      try {
        exportResultsToCSV(simResult, `${circuitId}-${inputType}-results.csv`);
        addLog('Results exported to CSV.');
      } catch (err) {
        addLog(`Error exporting CSV: ${err.message}`);
        setSimError(`Error exporting CSV: ${err.message}`);
      }
    }
  };

  const handleExportReport = () => {
    if (simResult) {
      try {
        // --- UPDATED: Convert base unit state `params` to UI units for report ---
        const uiParams = convertSolverToUI(params);
        exportReportToHTML(currentCircuit, uiParams, simResult, inputType);
        addLog('Report exported to HTML.');
      } catch (err) {
        addLog(`Error exporting report: ${err.message}`);
        setSimError(`Error exporting report: ${err.message}`);
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ my: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        RLC Circuit - Impedance Analysis
      </Typography>

      <Grid container spacing={3}>
        {/* --- LEFT CONTROL PANEL --- */}
        <Grid item xs={12} md={4} lg={3}>
          <ControlPanel
            circuitId={circuitId}
            allCircuits={circuitDefinitions}
            params={params} // Pass base units
            onCircuitChange={handleCircuitChange}
            onParamChange={handleParamChange}
            onSimulate={handleSimulate}
            simStatus={simStatus}
            inputType={inputType}
            onInputTypeChange={handleInputTypeChange}
            onConfigLoad={handleConfigLoad}
            onExportCSV={handleExportCSV}
            onExportReport={handleExportReport}
            simResult={simResult}
          />
          
          {/* Impedance Metrics (only shows for Sine) */}
          <ImpedanceDisplay
            status={simStatus}
            params={params} // Pass BASE units
            inputType={inputType}
            circuitId={circuitId} // Pass circuitId
          />
          {/* MetricsDisplay is deleted */}
        </Grid>

        {/* --- RIGHT MAIN AREA --- */}
        <Grid item xs={12} md={8} lg={9}>
          <Grid container spacing={3}>
            {/* Circuit Display */}
            <Grid item xs={12}>
              <SimulationDisplay circuit={currentCircuit} />
            </Grid>

            {/* Error Display */}
            {simStatus === 'error' && (
              <Grid item xs={12}>
                <Alert severity="error">{simError}</Alert>
              </Grid>
            )}

            {/* Analysis Display (now includes metrics) */}
            <Grid item xs={12}>
              <AnalysisDisplay
                circuit={currentCircuit}
                result={simResult}
                status={simStatus}
              />
            </Grid>

            {/* Plot Dashboard */}
            <Grid item xs={12}>
              <PlotDashboard
                circuit={currentCircuit}
                result={simResult}
                status={simStatus}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* --- BOTTOM LOG CONSOLE --- */}
        <Grid item xs={12}>
          <LogConsole logs={logs} />
        </Grid>
      </Grid>
    </Container>
  );
}

export default App;