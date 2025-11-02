import { createTheme } from '@mui/material/styles';

// A professional, dark theme inspired by the "capsa project"
const theme = createTheme({
  palette: {
    mode: 'dark', // Enable dark mode
    primary: {
      main: '#3498db', // Blue from capsa style
    },
    secondary: {
      main: '#2ecc71', // Green for results
    },
    background: {
      default: '#2c3e50', // Main background color
      paper: 'rgba(52, 73, 94, 0.85)', // Panel color
    },
    text: {
      primary: '#ecf0f1', // Light text
      secondary: '#bdc3c7', // Muted text
    },
  },
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h4: {
      fontWeight: 300,
      color: '#3498db',
      letterSpacing: '1px',
    },
    h5: {
      fontWeight: 400,
      color: '#3498db',
    },
    h6: {
      fontWeight: 400,
      color: '#3498db',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      borderBottom: '1px solid #34495e',
      paddingBottom: '8px',
      marginBottom: '16px',
    },
    body2: {
      color: '#bdc3c7',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #34495e',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(5px)',
          borderRadius: '8px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          transition: 'transform 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: '#2980b9',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#49637c',
            borderRadius: '6px',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#49637c',
          borderRadius: '6px',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#3498db',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#2ecc71', // Green accent
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 'bold',
          color: '#bdc3c7', // <-- ADDED: Use secondary text for unselected tabs
          '&.Mui-selected': {
            color: '#2ecc71', // Green accent
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          border: '1px solid',
        },
        standardInfo: {
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderColor: '#3498db',
          color: '#ecf0f1',
        },
        standardError: {
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderColor: '#e74c3c',
        }
      },
    },
  },
});

export default theme;