import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

function SimulationDisplay({ circuit }) {
  const imagePath = circuit
    ? `/images/${circuit.image}`
    : '/images/placeholder.svg';

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Circuit Diagram
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 250,
          background: '#f8f9fa',
          borderRadius: 1,
          overflow: 'hidden',
          p: 2,
        }}
      >
        <img
          src={imagePath}
          alt={circuit ? circuit.label : 'Circuit diagram'}
          style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }}
          onError={(e) => {
            // Handle broken image link
            e.target.onerror = null;
            e.target.src = '/images/placeholder.svg';
          }}
        />
      </Box>
    </Paper>
  );
}

export default SimulationDisplay;