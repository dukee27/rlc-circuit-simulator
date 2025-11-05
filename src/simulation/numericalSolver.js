//simulation/numericalSolver.js
/**
 * A generic 4th-order Runge-Kutta (RK4) numerical ODE solver.
 *
 * @param {function} odeFunc - The function defining the ODEs (state-space model).
 * Takes (t, state, params) and returns [dState_dt].
 * @param {number[]} initialState - The initial state vector [y1_0, y2_0, ...].
 * @param {object} params - Parameters object to pass to the ODE function.
 * @param {number} tStart - Start time.
 * @param {number} tEnd - End time.
 * @param {number} [points=1000] - Number of points to simulate.
 * @returns {object} - { time: number[], states: number[][] }
 */
export function solveODE(odeFunc, initialState, params, tStart, tEnd, points = 1000) {
  const dt = (tEnd - tStart) / (points - 1);
  
  // Initialize arrays
  const time = new Array(points);
  const states = new Array(points);
  for (let i = 0; i < points; i++) {
    states[i] = new Array(initialState.length);
  }

  // Set initial conditions
  time[0] = tStart;
  states[0] = [...initialState];
  
  let currentState = [...initialState];
  let t = tStart;

  // RK4 step function
  const add = (a, b, scale) => a.map((val, i) => val + b[i] * scale);

  for (let i = 1; i < points; i++) {
    // Calculate k1, k2, k3, k4
    const k1 = odeFunc(t, currentState, params);
    const k2 = odeFunc(t + 0.5 * dt, add(currentState, k1, 0.5 * dt), params);
    const k3 = odeFunc(t + 0.5 * dt, add(currentState, k2, 0.5 * dt), params);
    const k4 = odeFunc(t + dt, add(currentState, k3, dt), params);

    // Calculate next state
    const nextState = currentState.map((val, j) => 
      val + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
    );
    
    // Store results
    t += dt;
    time[i] = t;
    states[i] = nextState;
    currentState = nextState;
  }

  // Transpose states for easier plotting (e.g., all of state[0] in one array)
  const results = { time };
  for (let j = 0; j < initialState.length; j++) {
    results[`y${j}`] = states.map(state => state[j]);
  }
  
  return results;
}