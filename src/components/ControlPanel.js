//components/ControlPanel.js
import React from 'react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Divider,
  InputAdornment,
  CircularProgress,
  Slider,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import NotesIcon from '@mui/icons-material/Notes';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AutoGraphIcon from '@mui/icons-material/AutoGraph'; // <-- NEW ICON
import { saveConfigToFile } from '../simulation/fileUtils';

// Helper to get units for parameters
const getUnit = (paramName) => {
  if (paramName.startsWith('R')) return 'Ω';
  if (paramName.startsWith('L')) return 'mH';
  if (paramName.startsWith('C')) return 'µF';
  if (paramName.startsWith('V') && paramName !== 'V0') return 'V';
  if (paramName === 'V0') return 'V';
  if (paramName === 'Slope') return 'V/s'; // For Ramp input
  if (paramName.startsWith('I')) return 'A';
  if (paramName === 'tEnd') return 's';
  if (paramName === 'Freq') return 'Hz';
  return '';
};

// Helper to convert units for the solver
// UI (mH, µF) -> Solver (H, F)
const convertToSolver = (name, value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 0;
  if (name.startsWith('L')) return numValue / 1000; // mH -> H
  if (name.startsWith('C')) return numValue / 1000000; // µF -> F
  return numValue;
};

// Helper to convert units for the UI
// Solver (H, F) -> UI (mH, µF)
const convertFromSolver = (name, value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 0;
  if (name.startsWith('L')) return numValue * 1000; // H -> mH
  if (name.startsWith('C')) return numValue * 1000000; // F -> µF
  return numValue;
};

// Helper to get slider-friendly min/max/step
const getSliderProps = (paramName, value) => {
    const val = Number(value) || 0;
    if (paramName.startsWith('R')) return { min: 1, max: 10000, step: 10 };
    if (paramName.startsWith('L')) return { min: 0.1, max: 100, step: 0.1 }; // UI units (mH)
    if (paramName.startsWith('C')) return { min: 0.1, max: 1000, step: 0.1 }; // UI units (µF)
    if (paramName.startsWith('V') || paramName.startsWith('I') || paramName === 'Slope') return { min: 0, max: 50, step: 0.5 };
    // Default for tEnd, Freq
    const max = Math.max(1, val * 5 || 1000); // Ensure max is at least 1
    const step = Math.max(0.01, max / 100); // Ensure step is reasonable
    return { min: 0, max: max, step: step };
};


function ControlPanel(props) {
  const {
    circuitId,
    allCircuits,
    params,
    onCircuitChange,
    onParamChange,
    onSimulate,
    simStatus,
    inputType,
    onInputTypeChange,
    onConfigLoad,
    onExportCSV,
    onExportReport, // <-- ADDED
    simResult,
    
    // --- NEW: Locus props ---
    locusParams,
    locusStatus,
    onLocusParamChange,
    onGenerateLocus,
    currentCircuit // We now receive this from App.js
  } = props;

  // const currentCircuit = allCircuits[circuitId]; // This is now passed in

  // Group circuits by order
  const circuitGroups = Object.entries(allCircuits).reduce((acc, [id, def]) => {
    const orderLabel = def.order === 1 ? '1st Order' : def.order === 2 ? '2nd Order' : '3rd Order';
    if (!acc[orderLabel]) acc[orderLabel] = [];
    acc[orderLabel].push({ id, label: def.label });
    return acc;
  }, {});

  // --- UPDATED: Convert UI value to base unit before saving to state ---
  const handleLocalParamChange = (e) => {
    const { name, value } = e.target;
    // Value from text field is in UI units, convert to base units for state
    onParamChange(name, convertToSolver(name, value));
  };

  // --- UPDATED: Convert UI value to base unit before saving to state ---
  const handleSliderChange = (name, value) => {
    // Value from slider is in UI units, convert to base units for state
    onParamChange(name, convertToSolver(name, value));
  };

  const handleLocalSimulate = () => {
    // --- UPDATED: Params are already in base units, no conversion needed ---
    const solverParams = {};
    Object.keys(params).forEach((key) => {
      const val = parseFloat(params[key]);
      solverParams[key] = isNaN(val) ? 0 : val;
    });
    solverParams.inputType = inputType;
    onSimulate(solverParams);
  };
  
  // --- NEW: Handler for locus UI fields ---
  const handleLocusUIChange = (e) => {
    const { name, value } = e.target;
    // Special handling for min/max (numbers)
    if (name === 'min' || name === 'max') {
      const numVal = parseFloat(value);
      onLocusParamChange(name, isNaN(numVal) ? 0 : numVal);
    } else {
      onLocusParamChange(name, value);
    }
  };
  
  // --- NEW: Get relevant params for locus dropdown ---
  // Only 2nd order circuits have locus
  const showLocus = currentCircuit.order === 2 || currentCircuit.order === 3;
  // Get component params (R, L, C etc.)
  const locusParamOptions = currentCircuit.params.filter(p => 
    p.startsWith('R') || p.startsWith('L') || p.startsWith('C')
  );

  const handleSaveConfig = () => {
    // Config should save in UI units for readability
    const uiParams = {};
    Object.keys(params).forEach(key => {
      uiParams[key] = convertFromSolver(key, params[key]);
    });
    
    const configToSave = {
      circuitId,
      inputType,
      params: uiParams, // Save UI-friendly units
    };
    saveConfigToFile(configToSave, `sim-config-${circuitId}.json`);
  };

  const handleLoadConfig = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.circuitId && config.params && config.inputType) {
          // --- UPDATED: Convert loaded UI units to base units for state ---
          const baseParams = {};
          Object.keys(config.params).forEach(key => {
            baseParams[key] = convertToSolver(key, config.params[key]);
          });
          
          onConfigLoad({
            ...config,
            params: baseParams // Load base units into state
          });
        } else {
          alert('Error: Invalid configuration file.');
        }
      } catch (err) {
        alert('Error: Could not parse configuration file.');
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  // --- SX prop to hide number input spinners ---
  const hideSpinners = {
    // Hide arrow buttons in Chrome, Safari, Edge
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0,
    },
    // Hide arrow buttons in Firefox
    '& input[type=number]': {
      '-moz-appearance': 'textfield',
    },
  };

  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      {/* --- Circuit Selection --- */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Circuit Selection
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="circuit-select-label">Select Circuit</InputLabel>
          <Select
            labelId="circuit-select-label"
            label="Select Circuit"
            value={circuitId}
            onChange={(e) => onCircuitChange(e.target.value)}
          >
            {Object.entries(circuitGroups).map(([groupName, circuits]) => [
              <MenuItem
                key={groupName}
                disabled
                style={{
                  fontWeight: 'bold',
                  opacity: 1,
                  color: 'rgba(255, 255, 255, 0.7)',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                }}
              >
                {groupName}
              </MenuItem>,
              ...circuits.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.label}
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* --- Component Values --- */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <ScienceIcon sx={{ mb: -0.5, mr: 1, color: 'primary.main' }} />
          Component Values
        </Typography>
        <Grid container spacing={2} sx={{pl: 1, pr: 1}}>
          {currentCircuit.params.map((param) => {
            let label = param;
            if (param === 'V' && inputType === 'Ramp') label = 'Slope';
            else if (param === 'V' && inputType === 'Sine') label = 'V (Amplitude)';
            else if (param === 'V0') label = 'V (Initial)';
            else if (param === 'I0') label = 'I (Initial)';

            // --- UPDATED: Convert base unit (params) to UI unit (displayValue) ---
            const displayValue = convertFromSolver(param, params[param]);
            const sliderProps = getSliderProps(param, displayValue);
            
            return (
              <React.Fragment key={param}>
                <Grid item xs={6}> {/* <-- CHANGED */}
                  <TextField
                    label={label}
                    name={param}
                    type="number"
                    value={displayValue} // This is now in mH/µF
                    onChange={handleLocalParamChange}
                    fullWidth
                    size="small"
                    sx={hideSpinners} // <-- ADDED
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="body2" color="text.secondary">
                            {getUnit(label)}
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} sx={{display: 'flex', alignItems: 'center'}}> {/* <-- CHANGED */}
                  <Slider
                    name={param}
                    value={typeof displayValue === 'number' ? displayValue : 0} // This is now in mH/µF
                    onChange={(_, value) => handleSliderChange(param, value)}
                    aria-labelledby={`${param}-slider`}
                    min={sliderProps.min}
                    max={sliderProps.max}
                    step={sliderProps.step}
                  />
                </Grid>
              </React.Fragment>
            );
          })}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* --- Simulation Parameters --- */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <NotesIcon sx={{ mb: -0.5, mr: 1, color: 'primary.main' }} />
          Simulation Parameters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Input Type</InputLabel>
              <Select
                value={inputType}
                label="Input Type"
                onChange={(e) => onInputTypeChange(e.target.value)}
              >
                {currentCircuit.inputType.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {inputType === 'Sine' && (
             <Grid item xs={6}>
              <TextField
                label="Frequency"
                name="Freq"
                type="number"
                value={params.Freq} // Freq is already a base unit (Hz)
                onChange={handleLocalParamChange}
                fullWidth
                size="small"
                sx={hideSpinners} // <-- ADDED
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" color="text.secondary">Hz</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          <Grid item xs={inputType === 'Sine' ? 6 : 12}>
            <TextField
              label="Sim Time"
              name="tEnd"
              type="number"
              value={params.tEnd} // tEnd is already a base unit (s)
              onChange={handleLocalParamChange}
              fullWidth
              size="small"
              sx={hideSpinners} // <-- ADDED
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary">s</Typography>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* --- NEW: Root Locus Section --- */}
      {showLocus && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoGraphIcon sx={{ mb: -0.5, mr: 1, color: 'primary.main' }} />
              Root Locus Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Vary Parameter</InputLabel>
                  <Select
                    name="vary"
                    value={locusParams.vary}
                    label="Vary Parameter"
                    onChange={handleLocusUIChange}
                  >
                    {locusParamOptions.map((p) => (
                      <MenuItem key={p} value={p}>{p} ({getUnit(p)})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Min Value"
                  name="min"
                  type="number"
                  value={locusParams.min}
                  onChange={handleLocusUIChange}
                  fullWidth
                  size="small"
                  sx={hideSpinners}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="body2" color="text.secondary">
                          {getUnit(locusParams.vary)}
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Max Value"
                  name="max"
                  type="number"
                  value={locusParams.max}
                  onChange={handleLocusUIChange}
                  fullWidth
                  size="small"
                  sx={hideSpinners}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="body2" color="text.secondary">
                          {getUnit(locusParams.vary)}
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={
                    locusStatus === 'running' ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <AutoGraphIcon />
                    )
                  }
                  onClick={onGenerateLocus}
                  disabled={locusStatus === 'running' || simStatus === 'running'}
                >
                  {locusStatus === 'running' ? 'Generating...' : 'Generate Locus'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </>
      )}

      {/* --- Manage & Export Section --- */}
      <Divider sx={{ my: 3 }} />
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mb: -0.5, mr: 1, color: 'primary.main' }} />
          Manage & Export
        </Typography>
        <Grid container spacing={1}>
          {/* --- FIXED: Load Config Button --- */}
          <Grid item xs={6}>
            <Button
              variant="outlined"
              component="label" // This makes the button act as a label
              fullWidth
              startIcon={<FileOpenIcon />}
            >
              Load Config
              {/* This native input is visually hidden but triggered by the button */}
              <input 
                type="file" 
                hidden 
                accept=".json" 
                onChange={handleLoadConfig} 
              />
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SaveAltIcon />}
              onClick={handleSaveConfig}
            >
              Save Config
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AssessmentIcon />}
              onClick={() => onExportCSV()}
              disabled={simStatus !== 'complete' || !simResult}
            >
              Export Results as CSV
            </Button>
          </Grid>
          {/* --- NEW: Download Report Button --- */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SummarizeIcon />}
              onClick={() => onExportReport()}
              disabled={simStatus !== 'complete' || !simResult}
            >
              Download Report
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* --- Simulate Button --- */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          startIcon={
            simStatus === 'running' ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <PlayArrowIcon />
            )
          }
          onClick={handleLocalSimulate}
          disabled={simStatus === 'running' || locusStatus === 'running'} // <-- UPDATED
        >
          {simStatus === 'running' ? 'Simulating...' : 'Run Simulation'}
        </Button>
      </Box>
    </Paper>
  );
}

export default ControlPanel;