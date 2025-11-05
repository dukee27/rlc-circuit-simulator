//components/LogConsole.js
import React, { useRef, useEffect } from 'react';
import { Paper, Typography, Box } from '@mui/material';

function LogConsole({ logs }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Simulation Log
      </Typography>
      <Box
        sx={{
          height: '150px',
          overflowY: 'auto',
          backgroundColor: '#212529', // Darker background for contrast
          color: '#f8f9fa',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          p: 2,
          borderRadius: 1,
          border: '1px solid #34495e'
        }}
      >
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        <div ref={logEndRef} />
      </Box>
    </Paper>
  );
}

export default LogConsole;