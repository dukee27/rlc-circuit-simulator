# RLC Circuit Simulator

This project is an interactive RLC circuit simulator built with React. It allows users to adjust component values (Resistor, Inductor, Capacitor) and input types to see the circuit's behavior in real-time.

It provides time-domain graphs, frequency-domain (Bode) plots, and a pole-zero map to analyze the circuit's stability and response.

## 🚀 Live Demo

**You can use the live simulator here:** [**https://dukee27.github.io/rlc-circuit-simulator**](https://dukee27.github.io/rlc-circuit-simulator)

## Features

* **Interactive Controls:** Easily change R, L, and C values, input voltage, and input type (Step, Sine, etc.).
* **Time-Domain Analysis:** View plots for Capacitor Voltage (Vc), Current (i), Resistor Voltage (Vr), and Inductor Voltage (Vl) over time.
* **Frequency-Domain Analysis:** See the circuit's Magnitude and Phase response on a Bode plot.
* **Pole-Zero Map:** Analyze the system's stability by viewing the location of its poles and zeros on the s-plane.
* **Circuit Schematics:** Automatically updates the schematic based on the circuit you select.

## Getting Started Locally

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

To run this project on your local machine:

1.  Clone the repository:
    ```bash
    git clone [https://github.com/dukee27/rlc-circuit-simulator.git](https://github.com/dukee27/rlc-circuit-simulator.git)
    ```
2.  Navigate to the project directory:
    ```bash
    cd rlc-circuit-simulator
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the development server:
    ```bash
    npm start
    ```

This will open the app in your browser at [http://localhost:3000](http://localhost:3000).