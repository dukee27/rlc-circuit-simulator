import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from '@mui/material';
import theme from './theme';

test('renders the simulator title', () => {
  render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
  const titleElement = screen.getByText(/Transient & Frequency Simulator/i);
  expect(titleElement).toBeInTheDocument();
});