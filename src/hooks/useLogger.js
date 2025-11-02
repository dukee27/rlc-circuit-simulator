import { useState, useCallback } from 'react';

export const useLogger = () => {
  const [logs, setLogs] = useState(['[SimEngine] Simulator Initialized. Ready.']);

  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [...prevLogs, `[${timestamp}] ${message}`]);
  }, []);

  return { logs, addLog };
};